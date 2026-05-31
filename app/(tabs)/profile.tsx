/**
 * app/(tabs)/profile.tsx
 *
 * Stage 21 — Own Profile screen (tab 4).
 *
 * Shows the signed-in user's profile per DESIGN-SPEC §9.3 and SCREENS.md #20:
 *   - Avatar (initials derived from full_name)
 *   - Name and university
 *   - Verified badge (from useAuth().isVerified)
 *   - Stats row: Rating, Trips, Reliability (placeholders until Phase 9 reviews/trips)
 *   - Edit profile and Settings (cog) actions
 *
 * Women-only badge is intentionally NOT shown here: per DESIGN-SPEC §6.7 it belongs
 * on ride cards / driver profiles in the ride context (Phase 6), not as a profile flag.
 *
 * Data sources:
 *   - users.full_name via useAuth() user_metadata
 *   - profiles.bio, profiles.university, profiles.travel_preferences via Supabase query
 *
 * Spec-local constant:
 *   STATS_DIVIDER_COLOR — thin divider between stat columns, not in §1 palette
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** Thin vertical divider between stat columns — not in §1 palette */
const STATS_DIVIDER_COLOR = 'rgba(40,30,20,0.12)';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  university: string | null;
  bio: string | null;
  travel_preferences: Record<string, unknown> | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { user, isVerified } = useAuth();

  const [profile, setProfile]     = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('university, bio, travel_preferences')
        .eq('user_id', user.id)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = row not found — first-time user with no profile yet
        setError('Could not load your profile. Please try again.');
        return;
      }
      setProfile(data ?? null);
    } catch {
      setError('Could not load your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // ── Derived display values ─────────────────────────────────────────────────

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('');

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerState} testID="profile-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.centerState} testID="profile-error">
        <Ionicons name="alert-circle-outline" size={40} color={Colors.textSecondary} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={fetchProfile}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry loading profile"
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="profile-screen"
    >
      {/* ── Header row: title + cog ─────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          testID="settings-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Profile hero card ───────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <Avatar
          initials={initials || '?'}
          size={72}
          color="primary"
          testID="profile-avatar"
        />

        <Text style={styles.nameText} testID="profile-name">
          {fullName || 'Your name'}
        </Text>

        {profile?.university ? (
          <Text style={styles.universityText} testID="profile-university">
            {profile.university}
          </Text>
        ) : null}

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        <View style={styles.badgeRow}>
          {isVerified && (
            <Badge variant="verified" style={styles.badge} testID="verified-badge" />
          )}
        </View>
      </View>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
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

      {/* ── Bio ─────────────────────────────────────────────────────────────── */}
      {profile?.bio ? (
        <View style={styles.bioCard}>
          <Text style={styles.bioText} testID="profile-bio">{profile.bio}</Text>
        </View>
      ) : null}

      {/* ── Action buttons ──────────────────────────────────────────────────── */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/edit-profile')}
          accessibilityRole="button"
          accessibilityLabel="Edit your profile"
          testID="edit-profile-button"
        >
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/my-rides')}
          accessibilityRole="button"
          accessibilityLabel="View your rides"
          testID="my-rides-button"
        >
          <Ionicons name="car-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionButtonText}>My rides</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonLast]}
          onPress={() => router.push('/vehicle-details')}
          accessibilityRole="button"
          accessibilityLabel="Manage vehicle details"
          testID="vehicle-details-button"
        >
          <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Vehicle details</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    marginTop: Spacing.sm,
  },
  retryText: {
    ...Typography.buttonSmall,
    color: Colors.primary,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  screenTitle: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
  },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.sectionGap,
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
  badge: {},

  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    flexDirection: 'row',
    marginBottom: Spacing.sectionGap,
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

  bioCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.sectionGap,
  },
  bioText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  actionsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  actionButtonLast: {
    borderBottomWidth: 0,
  },
  actionButtonText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
});
