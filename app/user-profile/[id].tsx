/**
 * app/user-profile/[id].tsx
 *
 * Stage 24 — Other User Profile screen.
 *
 * Read-only view of another user's profile. Shows:
 *   - Avatar, name, university, verified + women-only badges
 *   - Stats: Rating, Trips, Reliability
 *   - Reviews section placeholder (populated in Phase 9)
 *   - "Report this user" button (modal stub)
 *
 * Data fetched from public.users + public.profiles + public.verification
 * by the target user's id (route param).
 *
 * Spec-local constants:
 *   STATS_DIVIDER_COLOR — thin divider between stat columns
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// ─── Spec-local constants ─────────────────────────────────────────────────────

const STATS_DIVIDER_COLOR = 'rgba(40,30,20,0.12)';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherUserData {
  full_name:    string;
  university:   string | null;
  isVerified:   boolean;
  womenOnly:    boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [userData,    setUserData]    = useState<OtherUserData | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [reportModal, setReportModal] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!id) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      // Fetch user, profile, and verification in parallel
      const [userRes, profileRes, verifyRes] = await Promise.all([
        supabase.from('users').select('full_name').eq('id', id).single(),
        supabase.from('profiles').select('university, women_only_mode').eq('user_id', id).single(),
        supabase.from('verification').select('id_verified, selfie_verified').eq('user_id', id).single(),
      ]);

      if (userRes.error && userRes.error.code !== 'PGRST116') {
        setError('Could not load this profile.');
        return;
      }

      const isVerified =
        verifyRes.data?.id_verified === true &&
        verifyRes.data?.selfie_verified === true;

      setUserData({
        full_name:  userRes.data?.full_name ?? 'Unknown',
        university: profileRes.data?.university ?? null,
        isVerified,
        womenOnly:  profileRes.data?.women_only_mode === true,
      });
    } catch {
      setError('Could not load this profile.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchUser(); }, [fetchUser]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const initials = userData?.full_name
    ? userData.full_name.split(' ').filter(Boolean).slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '').join('')
    : '?';

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerState} testID="user-profile-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (error || !userData) {
    return (
      <View style={styles.centerState} testID="user-profile-error">
        <Ionicons name="alert-circle-outline" size={40} color={Colors.textSecondary} />
        <Text style={styles.errorText}>{error ?? 'User not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryButton} accessibilityRole="button">
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="user-profile-screen"
      >
        {/* ── Back button ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <Avatar
            initials={initials}
            size={72}
            color={userData.womenOnly ? 'lavender' : 'primary'}
            testID="user-avatar"
          />
          <Text style={styles.nameText} testID="user-name">{userData.full_name}</Text>
          {userData.university ? (
            <Text style={styles.universityText} testID="user-university">
              {userData.university}
            </Text>
          ) : null}
          <View style={styles.badgeRow}>
            {userData.isVerified && (
              <Badge variant="verified" testID="verified-badge" />
            )}
            {userData.womenOnly && (
              <Badge variant="womenOnly" testID="women-only-badge" />
            )}
          </View>
        </View>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <View style={styles.statsCard}>
          <View style={styles.statItem} testID="stat-rating">
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem} testID="stat-trips">
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem} testID="stat-reliability">
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Reliability</Text>
          </View>
        </View>

        {/* ── Reviews placeholder ─────────────────────────────────────────── */}
        <View style={styles.sectionCard} testID="reviews-section">
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.placeholderText}>
            Reviews will appear here after completed trips.
          </Text>
        </View>

        {/* ── Report button ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setReportModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Report this user"
          testID="report-button"
        >
          <Ionicons name="flag-outline" size={16} color={Colors.sos} />
          <Text style={styles.reportText}>Report this user</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Report modal stub ─────────────────────────────────────────────── */}
      <Modal
        visible={reportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModal(false)}
        testID="report-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Report user</Text>
            <Text style={styles.modalBody}>
              This feature is coming soon. If you are in danger, call 999 (ROI) or 999/112 (NI).
            </Text>
            <Button
              title="Close"
              onPress={() => setReportModal(false)}
              testID="report-modal-close"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.sectionGap,
  },
  centerState: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPadding,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
  },
  retryText: {
    ...Typography.buttonSmall,
    color: Colors.primary,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  nameText: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  universityText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statValue: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: STATS_DIVIDER_COLOR,
    marginVertical: Spacing.md,
  },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    padding: Spacing.cardPadding,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  placeholderText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },

  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  reportText: {
    ...Typography.bodySmall,
    color: Colors.sos,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  modalTitle: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
  },
  modalBody: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
});
