/**
 * app/(tabs)/index.tsx
 *
 * Stage 33 — Search tab (tab 1). Per DESIGN-SPEC §9.2 and SCREENS.md #7.
 *
 * Toggle between "Find a journey" and "Offer a journey" modes.
 * Find mode: RouteInput (labelled), date, seats (max 4), women-only filter → Search
 * Offer mode: routes directly to /offer-ride screen
 */

import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RouteInput } from '../../components/RouteInput';
import { DateTimeField } from '../../components/DateTimeField';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  FontFamily,
} from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** §9.2 verified IDs card background — not in §1 palette */
const VERIFIED_CARD_BG  = '#E8F8EE';
const TOGGLE_TRACK_OFF  = 'rgba(40,30,20,0.15)'; // §9.2 switch — not in palette

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [mode,       setMode]       = useState<'find' | 'offer'>('find');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [date,       setDate]       = useState('');
  const [flexDays,   setFlexDays]   = useState<0 | 1 | 2 | 3>(0);
  const [seats,      setSeats]      = useState(1);
  const [womenOnly,  setWomenOnly]  = useState(false);

  const firstName = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')[0] ?? 'there';

  const handleSearch = () => {
    const params = new URLSearchParams({
      from, to, date,
      flexDays: String(flexDays),
      seats: String(seats),
      womenOnly: String(womenOnly),
    });
    router.push(`/search-results?${params.toString()}`);
  };

  const isSearchValid = from.trim().length > 0 && to.trim().length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="search-screen"
    >
      {/* Greeting */}
      <View style={styles.headerRow}>
        <Text style={styles.greeting} testID="greeting">Hey {firstName} 👋</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="View profile"
          testID="header-avatar"
        >
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={18} color={Colors.surface} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle} testID="mode-toggle">
        <TouchableOpacity
          style={[styles.modeTab, mode === 'find' && styles.modeTabActive]}
          onPress={() => setMode('find')}
          accessibilityRole="button"
          testID="mode-find"
        >
          <Text style={[styles.modeTabText, mode === 'find' && styles.modeTabTextActive]}>
            Find a journey
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'offer' && styles.modeTabActive]}
          onPress={() => setMode('offer')}
          accessibilityRole="button"
          testID="mode-offer"
        >
          <Text style={[styles.modeTabText, mode === 'offer' && styles.modeTabTextActive]}>
            Offer a journey
          </Text>
        </TouchableOpacity>
      </View>

      {/* Find mode */}
      {mode === 'find' && (
        <View testID="find-mode-content" style={styles.findContent}>
          {/* Origin + destination, with prominent labels */}
          <RouteInput
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            fromLabel="Departing from"
            toLabel="Destination"
            fromPlaceholder="City, town or university"
            toPlaceholder="City, town or university"
            testID="search-route-input"
          />

          {/* When — native calendar picker (value contract unchanged: YYYY-MM-DD) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>When do you want to travel?</Text>
            <DateTimeField
              mode="date"
              value={date}
              onChange={setDate}
              placeholder="Pick a date"
              minimumDate={new Date()}
              testID="search-date-input"
            />
          </View>

          {/* Date flexibility */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date flexibility</Text>
            <View style={styles.flexRow}>
              {FLEX_OPTIONS.map((opt) => {
                const active = flexDays === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.flexChip, active && styles.flexChipActive]}
                    onPress={() => setFlexDays(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.a11y}
                    accessibilityState={{ selected: active }}
                    testID={`flex-${opt.value}`}
                  >
                    <Text style={[styles.flexChipText, active && styles.flexChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Seats */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Number of seats required</Text>
            <View style={styles.seatsChip}>
              <TouchableOpacity
                onPress={() => setSeats((s) => Math.max(1, s - 1))}
                testID="search-seats-dec"
                accessibilityRole="button"
                accessibilityLabel="Decrease seats"
              >
                <Ionicons name="remove" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.seatsText} testID="search-seats-value">{seats}</Text>
              <TouchableOpacity
                onPress={() => setSeats((s) => Math.min(4, s + 1))}
                testID="search-seats-inc"
                accessibilityRole="button"
                accessibilityLabel="Increase seats"
              >
                <Ionicons name="add" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Women-only filter */}
          <View style={styles.womenOnlyRow}>
            <Text style={styles.womenOnlyLabel}>Women-only journeys</Text>
            <Switch
              value={womenOnly}
              onValueChange={setWomenOnly}
              trackColor={{ false: TOGGLE_TRACK_OFF, true: Colors.primary }}
              thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
              testID="women-only-filter"
              accessibilityRole="switch"
              accessibilityLabel="Show women-only journeys only"
              accessibilityState={{ checked: womenOnly }}
            />
          </View>

          <Button
            title="Search"
            onPress={handleSearch}
            disabled={!isSearchValid}
            style={styles.ctaButton}
            testID="search-button"
          />
        </View>
      )}

      {/* Offer mode */}
      {mode === 'offer' && (
        <View testID="offer-mode-content">
          <Text style={styles.offerPrompt}>
            Share your journey and split the cost.
          </Text>
          <Button
            title="Post a journey"
            onPress={() => router.push('/offer-ride')}
            style={styles.ctaButton}
            testID="post-ride-button"
          />
        </View>
      )}

      {/* Safety feature grid */}
      <View style={styles.safetySection}>
        <Text style={styles.safetySectionTitle}>Built with you in mind</Text>
        <View style={styles.safetyGrid}>
          {SAFETY_FEATURES.map((f) => (
            <View key={f.title} style={[styles.safetyCard, { backgroundColor: f.bg }]}>
              <Ionicons name={f.icon} size={24} color={f.iconColor} />
              <Text style={styles.safetyCardTitle}>{f.title}</Text>
              <Text style={styles.safetyCardDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// Date-flexibility options for Find mode (±N days around the chosen date).
const FLEX_OPTIONS: { value: 0 | 1 | 2 | 3; label: string; a11y: string }[] = [
  { value: 0, label: 'Exact',   a11y: 'Exact date only' },
  { value: 1, label: '±1 day',  a11y: 'Plus or minus 1 day' },
  { value: 2, label: '±2 days', a11y: 'Plus or minus 2 days' },
  { value: 3, label: '±3 days', a11y: 'Plus or minus 3 days' },
];

type SafetyFeature = {
  title:     string;
  desc:      string;
  icon:      ComponentProps<typeof Ionicons>['name'];
  bg:        string;
  iconColor: string;
};

const SAFETY_FEATURES: SafetyFeature[] = [
  { title: 'Share journey', desc: 'Nominated contact gets live updates', icon: 'share-outline', bg: Colors.primaryLight, iconColor: Colors.primary },
  { title: 'Women-only', desc: 'Verified female drivers and passengers', icon: 'shield-outline', bg: Colors.lavenderLight, iconColor: Colors.lavender },
  { title: 'Verified IDs', desc: 'Every account identity-checked', icon: 'shield-checkmark-outline', bg: VERIFIED_CARD_BG, iconColor: Colors.verified },
  { title: 'In-app SOS', desc: 'Silent alert to your contact', icon: 'alert-circle-outline', bg: Colors.sosLight, iconColor: Colors.sos },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...Typography.headingLarge, color: Colors.textPrimary },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  modeTab: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: {
    fontSize: 14, fontFamily: FontFamily.semiBold, color: Colors.primary,
  },
  modeTabTextActive: { color: Colors.surface },
  findContent: { gap: Spacing.lg },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { ...Typography.headingSmall, color: Colors.textPrimary },
  flexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  flexChip: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  flexChipActive: { backgroundColor: Colors.primary },
  flexChipText: { fontSize: 14, fontFamily: FontFamily.semiBold, color: Colors.primary },
  flexChipTextActive: { color: Colors.surface },
  seatsChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignSelf: 'flex-start', justifyContent: 'center',
  },
  seatsText: { ...Typography.bodyMedium, color: Colors.primary, minWidth: 20, textAlign: 'center' },
  womenOnlyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  womenOnlyLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  ctaButton: {},
  offerPrompt: { ...Typography.bodyLarge, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.lg },
  safetySection: { gap: Spacing.md },
  safetySectionTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  safetyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  safetyCard: {
    flex: 1, minWidth: '45%', borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding, gap: Spacing.xs,
  },
  safetyCardTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  safetyCardDesc: { ...Typography.bodySmall, color: Colors.textSecondary },
});
