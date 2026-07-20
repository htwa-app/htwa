/**
 * app/settings.tsx
 *
 * Settings screen (SCREENS.md #23) — accessed via the cog on the Profile tab.
 *
 * Sections:
 *  - Notifications: per-user toggles (profiles.notification_prefs)
 *  - Safety: default nominated contact (pre-fills each journey's contact),
 *    women-only mode (female drivers; enforcement is DB-level both directions)
 *  - Account: currency display (EUR/GBP), sign out, delete account
 *    (anonymise-in-place per Privacy Policy §7A via the delete-account
 *    Edge Function)
 *  - Legal: Terms, Privacy Policy, Community Safety Pledge (in-app viewers,
 *    text generated verbatim from legal/)
 *
 * Every load distinguishes error from empty (retry state); every write checks
 * affected rows per CLAUDE.md §12.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert,
  ActivityIndicator, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { devResetAndSignOut } from '../utils/devReset';
import type { Currency, Gender } from '../types/database';

const TOGGLE_TRACK_OFF = 'rgba(40,30,20,0.15)'; // §9.2 switch — not in palette

const NOTIFICATION_OPTIONS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'booking_updates', label: 'Booking updates', hint: 'Requests, confirmations and declines' },
  { key: 'trip_reminders', label: 'Journey reminders', hint: 'Upcoming departures and check-ins' },
  { key: 'safety_alerts', label: 'Safety alerts', hint: 'Alerts for journeys you are the nominated contact for' },
];

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [womenOnly, setWomenOnly] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSavedNote, setContactSavedNote] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(false);
    try {
      const [profileRes, userRes] = await Promise.all([
        supabase.from('profiles')
          .select('notification_prefs, women_only_mode, nominated_contact')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('users')
          .select('currency, gender')
          .eq('id', user.id)
          .maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (userRes.error) throw userRes.error;

      setPrefs((profileRes.data?.notification_prefs as Record<string, boolean>) ?? {});
      setWomenOnly(profileRes.data?.women_only_mode ?? false);
      const nc = profileRes.data?.nominated_contact as { name?: string; phone?: string } | null;
      setContactName(nc?.name ?? '');
      setContactPhone(nc?.phone ?? '');
      setCurrency((userRes.data?.currency as Currency) ?? 'EUR');
      setGender((userRes.data?.gender as Gender) ?? null);
    } catch (e) {
      console.error('[Settings] load failed:', e instanceof Error ? e.message : e);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // ── Writers (each checks affected rows) ───────────────────────────────────

  const saveProfileField = async (key: string, patch: Record<string, unknown>): Promise<boolean> => {
    if (!user) return false;
    setBusyKey(key);
    setActionError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
        .select('user_id');
      if (error || !data || data.length === 0) {
        setActionError('Could not save that setting. Please try again.');
        return false;
      }
      return true;
    } catch {
      setActionError('Could not save that setting. Please try again.');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const togglePref = async (key: string) => {
    const next = { ...prefs, [key]: !(prefs[key] ?? true) };
    const prev = prefs;
    setPrefs(next); // optimistic; reverted on failure
    if (!await saveProfileField(`pref-${key}`, { notification_prefs: next })) setPrefs(prev);
  };

  const toggleWomenOnly = async (value: boolean) => {
    const prev = womenOnly;
    setWomenOnly(value);
    if (!await saveProfileField('women-only', { women_only_mode: value })) setWomenOnly(prev);
  };

  const saveContact = async () => {
    setContactSavedNote(null);
    if (!contactName.trim() || !contactPhone.trim()) {
      setActionError('Contact name and phone are both required.');
      return;
    }
    const ok = await saveProfileField('contact', {
      nominated_contact: { name: contactName.trim(), phone: contactPhone.trim() },
    });
    if (ok) setContactSavedNote('Default contact saved — it pre-fills each new journey.');
  };

  const changeCurrency = async (value: Currency) => {
    if (!user || value === currency) return;
    const prev = currency;
    setCurrency(value);
    setBusyKey('currency');
    setActionError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ currency: value })
        .eq('id', user.id)
        .select('id');
      if (error || !data || data.length === 0) {
        setCurrency(prev);
        setActionError('Could not change your currency. Please try again.');
      }
    } catch {
      setCurrency(prev);
      setActionError('Could not change your currency. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSignOut = async () => {
    setBusyKey('signout');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setActionError('Sign out failed. Please try again.');
        return;
      }
      router.replace('/login');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Your identity is removed from htwa and your sign-in is deleted. Journey and payment records are kept in anonymised form as described in the Privacy Policy. This cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: () => void (async () => {
            setBusyKey('delete');
            setActionError(null);
            try {
              const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
              if (error || !(data as { ok?: boolean } | null)?.ok) {
                setActionError('Account deletion failed. Please try again or contact hello@htwa-app.com.');
                return;
              }
              await supabase.auth.signOut();
              router.replace('/login');
            } catch {
              setActionError('Account deletion failed. Please try again or contact hello@htwa-app.com.');
            } finally {
              setBusyKey(null);
            }
          })(),
        },
      ],
    );
  };

  // DEV-ONLY: sign out + wipe cached session/onboarding state.
  const handleDevReset = async (): Promise<void> => {
    setResetError(null);
    setResetting(true);
    try {
      await devResetAndSignOut();
      router.replace('/login');
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Reset failed. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]} testID="settings-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.screen, styles.center]} testID="settings-load-error">
        <Text style={styles.errorText}>Couldn't load your settings.</Text>
        <TouchableOpacity onPress={load} accessibilityRole="button" testID="settings-retry">
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="settings-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      {actionError && <Text style={styles.errorText} testID="settings-action-error">{actionError}</Text>}

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Notifications</Text>
      <View style={styles.card}>
        {NOTIFICATION_OPTIONS.map((opt, i) => (
          <View key={opt.key} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>{opt.label}</Text>
              <Text style={styles.rowHint}>{opt.hint}</Text>
            </View>
            <Switch
              value={prefs[opt.key] ?? true}
              onValueChange={() => void togglePref(opt.key)}
              disabled={busyKey === `pref-${opt.key}`}
              trackColor={{ false: TOGGLE_TRACK_OFF, true: Colors.primary }}
              thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
              accessibilityRole="switch"
              accessibilityLabel={opt.label}
              testID={`pref-${opt.key}`}
            />
          </View>
        ))}
      </View>

      {/* ── Safety ─────────────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Safety</Text>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>Default nominated contact</Text>
        <Text style={styles.rowHint}>
          Pre-fills the contact for each new journey. You can change it per journey before departure.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Contact name"
          placeholderTextColor={Colors.textTertiary}
          value={contactName}
          onChangeText={setContactName}
          testID="default-contact-name"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (e.g. +353 87 123 4567)"
          placeholderTextColor={Colors.textTertiary}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          testID="default-contact-phone"
        />
        <TouchableOpacity
          style={[styles.saveBtn, busyKey === 'contact' && styles.disabled]}
          onPress={() => void saveContact()}
          disabled={busyKey === 'contact'}
          accessibilityRole="button"
          testID="save-default-contact"
        >
          <Text style={styles.saveBtnText}>{busyKey === 'contact' ? 'Saving…' : 'Save contact'}</Text>
        </TouchableOpacity>
        {contactSavedNote && <Text style={styles.savedNote} testID="contact-saved-note">{contactSavedNote}</Text>}

        {gender === 'female' && (
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Women-only mode</Text>
              <Text style={styles.rowHint}>
                Journeys you offer default to women-only. Enforced for every booking, not just hidden in search.
              </Text>
            </View>
            <Switch
              value={womenOnly}
              onValueChange={(v) => void toggleWomenOnly(v)}
              disabled={busyKey === 'women-only'}
              trackColor={{ false: TOGGLE_TRACK_OFF, true: Colors.primary }}
              thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
              accessibilityRole="switch"
              accessibilityLabel="Women-only mode"
              testID="women-only-toggle"
            />
          </View>
        )}
      </View>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>Currency</Text>
            <Text style={styles.rowHint}>How prices are shown to you</Text>
          </View>
          <View style={styles.segment} testID="currency-segment">
            {(['EUR', 'GBP'] as Currency[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.segmentBtn, currency === c && styles.segmentBtnActive]}
                onPress={() => void changeCurrency(c)}
                disabled={busyKey === 'currency'}
                accessibilityRole="button"
                accessibilityState={{ selected: currency === c }}
                testID={`currency-${c}`}
              >
                <Text style={[styles.segmentText, currency === c && styles.segmentTextActive]}>
                  {c === 'EUR' ? '€ EUR' : '£ GBP'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.row, styles.rowBorder]}
          onPress={() => void handleSignOut()}
          disabled={busyKey === 'signout'}
          accessibilityRole="button"
          testID="sign-out-button"
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.textPrimary} />
          <Text style={[styles.rowLabel, styles.flex]}>{busyKey === 'signout' ? 'Signing out…' : 'Sign out'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, styles.rowBorder]}
          onPress={handleDeleteAccount}
          disabled={busyKey === 'delete'}
          accessibilityRole="button"
          testID="delete-account-button"
        >
          <Ionicons name="trash-outline" size={20} color={Colors.sos} />
          <Text style={[styles.rowLabel, styles.flex, styles.danger]}>
            {busyKey === 'delete' ? 'Deleting…' : 'Delete account'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Legal ──────────────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Legal</Text>
      <View style={styles.card}>
        {([
          ['terms', 'Terms of Service'],
          ['privacy', 'Privacy Policy'],
          ['safety-pledge', 'Community Safety Pledge'],
        ] as const).map(([slug, label], i) => (
          <TouchableOpacity
            key={slug}
            style={[styles.row, i > 0 && styles.rowBorder]}
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: slug } })}
            accessibilityRole="button"
            testID={`legal-link-${slug}`}
          >
            <Text style={[styles.rowLabel, styles.flex]}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {__DEV__ && (
        <View style={styles.devSection} testID="dev-tools">
          <Text style={styles.devLabel}>Developer tools</Text>
          <TouchableOpacity
            style={[styles.devButton, resetting && styles.disabled]}
            onPress={() => void handleDevReset()}
            disabled={resetting}
            accessibilityRole="button"
            accessibilityLabel="Reset and sign out (dev)"
            testID="dev-reset-button"
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.sos} />
            <Text style={styles.devButtonText}>
              {resetting ? 'Resetting…' : 'Reset / Sign out (dev)'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.devHint}>
            Signs out and clears cached onboarding state so the next launch starts fresh.
          </Text>
          {resetError ? (
            <Text style={styles.devError} testID="dev-reset-error">{resetError}</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.sm,
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  spacer: { width: 24 },

  sectionLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowHint: { ...Typography.bodySmall, color: Colors.textTertiary },
  danger: { color: Colors.sos },
  link: { ...Typography.bodyMedium, color: Colors.primary },
  errorText: { ...Typography.bodySmall, color: Colors.sos, textAlign: 'center' },
  savedNote: { ...Typography.bodySmall, color: Colors.primary },

  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  saveBtnText: { ...Typography.bodyMedium, color: Colors.surface },
  disabled: { opacity: 0.6 },

  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { ...Typography.bodySmall, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.surface },

  devSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.xl,
  },
  devLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.sos,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
  },
  devButtonText: {
    ...Typography.bodyMedium,
    color: Colors.sos,
  },
  devHint: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  devError: {
    ...Typography.bodySmall,
    color: Colors.sos,
  },
});
