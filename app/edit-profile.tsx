/**
 * app/edit-profile.tsx
 *
 * Stage 22 — Edit Profile screen.
 *
 * Allows the user to update:
 *   - Bio (free text)
 *   - University
 *   - Travel preferences (toggleable chips: chatty, music ok, no smoking, pets ok)
 *
 * Photo upload is deferred — placeholder shown instead.
 * Saves via supabase.from('profiles').upsert({ onConflict: 'user_id' }).
 *
 * Note: PREF_CHIP_SELECTED_BG/TXT use Colors.primary / Colors.surface directly.
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
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  FontFamily,
} from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { uploadStudentCard } from '../services/studentCard';
import { pickStudentCardImage } from '../services/imagePicker';
import type { UniversityVerificationStatus } from '../types/database';

// Labels + colours for the university verification status badge.
const UNI_STATUS: Record<UniversityVerificationStatus, { label: string; color: string }> = {
  unverified: { label: 'Not verified',     color: Colors.textSecondary },
  pending:    { label: 'Pending review',   color: Colors.amber },
  verified:   { label: 'Verified',         color: Colors.verified },
  rejected:   { label: 'Rejected — re-upload', color: Colors.sos },
};

// ─── Spec-local constants ─────────────────────────────────────────────────────

const PREF_CHIP_SELECTED_BG  = Colors.primary;
const PREF_CHIP_SELECTED_TXT = Colors.surface;
/** Chip fixed height per DESIGN-SPEC §6.6 */
const PREF_CHIP_HEIGHT = 28;

// ─── Types ────────────────────────────────────────────────────────────────────

type TravelPreferences = {
  chatty:    boolean;
  musicOk:   boolean;
  noSmoking: boolean;
  petsOk:    boolean;
};

const DEFAULT_PREFS: TravelPreferences = {
  chatty:    false,
  musicOk:   false,
  noSmoking: false,
  petsOk:    false,
};

const PREF_LABELS: Record<keyof TravelPreferences, string> = {
  chatty:    'Happy to chat',
  musicOk:   'Music OK',
  noSmoking: 'No smoking',
  petsOk:    'Pets OK',
};

// ─── Sub-component: PrefChip ──────────────────────────────────────────────────

interface PrefChipProps {
  label:    string;
  selected: boolean;
  onPress:  () => void;
  testID?:  string;
}

function PrefChip({ label, selected, onPress, testID }: PrefChipProps) {
  return (
    <TouchableOpacity
      style={[styles.prefChip, selected && styles.prefChipSelected]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Text style={[styles.prefChipLabel, selected && styles.prefChipLabelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [bio,        setBio]        = useState('');
  const [university, setUniversity] = useState('');
  const [prefs,      setPrefs]      = useState<TravelPreferences>(DEFAULT_PREFS);
  const [uniStatus,  setUniStatus]  = useState<UniversityVerificationStatus>('unverified');
  const [uploading,  setUploading]  = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  const universityMissing = university.trim().length === 0;

  // ─── Load existing profile ─────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('bio, university, travel_preferences, university_verification_status')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setBio(data.bio ?? '');
        setUniversity(data.university ?? '');
        setUniStatus((data.university_verification_status ?? 'unverified') as UniversityVerificationStatus);
        const saved = (data.travel_preferences ?? {}) as Partial<TravelPreferences>;
        setPrefs({ ...DEFAULT_PREFS, ...saved });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const togglePref = (key: keyof TravelPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUploadStudentCard = async () => {
    if (!user) return;
    setUploadNote(null);
    setUploading(true);
    try {
      const bytes = await pickStudentCardImage();
      if (!bytes) {
        // Native image-picker not installed yet (see services/imagePicker.ts).
        setUploadNote('Photo upload needs the camera module — coming in the next build.');
        return;
      }
      const result = await uploadStudentCard(user.id, bytes);
      if (!result.ok) { setUploadNote('Upload failed. Please try again.'); return; }
      setUniStatus(result.status);
      setUploadNote('Student card uploaded — we’ll review it shortly.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (universityMissing) { setSaveError('University is required.'); return; }
    setSaveError(null);
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert(
        {
          user_id:            user.id,
          bio:                bio.trim() || null,
          university:         university.trim() || null,
          travel_preferences: prefs,
        },
        { onConflict: 'user_id' },
      );
      if (error) { setSaveError(error.message); return; }
      router.back();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Unable to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerState} testID="edit-profile-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="edit-profile-screen"
    >
      {/* ── Back + title ─────────────────────────────────────────────────────── */}
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
        <Text style={styles.screenTitle}>Edit profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Photo placeholder ─────────────────────────────────────────────────── */}
      <View style={styles.photoSection}>
        <View style={styles.photoPlaceholder} testID="photo-placeholder">
          <Ionicons name="camera-outline" size={28} color={Colors.textSecondary} />
        </View>
        <Text style={styles.photoHint}>Photo upload coming soon</Text>
      </View>

      {/* ── Bio ──────────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Bio</Text>
        <Input
          placeholder="Tell other riders a bit about yourself"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          style={styles.centeredInput}
          testID="bio-input"
        />
      </View>

      {/* ── University (mandatory) ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>University *</Text>
        <Input
          placeholder="e.g. UCD, TCD, DCU"
          value={university}
          onChangeText={setUniversity}
          autoCapitalize="words"
          style={styles.centeredInput}
          testID="university-input"
        />
        {universityMissing && (
          <Text style={styles.requiredHint} testID="university-required">University is required.</Text>
        )}

        {/* University verification (Block 6) */}
        <View style={styles.verifyRow}>
          <Text style={styles.verifyLabel}>Student card</Text>
          <Text style={[styles.verifyStatus, { color: UNI_STATUS[uniStatus].color }]} testID="uni-status">
            {UNI_STATUS[uniStatus].label}
          </Text>
        </View>
        <Text style={styles.verifyHint}>
          Upload a photo of your student card. The name must match the name on your verified ID.
        </Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={handleUploadStudentCard}
          disabled={uploading}
          accessibilityRole="button"
          testID="upload-student-card"
        >
          <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
          <Text style={styles.uploadBtnText}>
            {uploading ? 'Uploading…' : 'Upload student card'}
          </Text>
        </TouchableOpacity>
        {uploadNote && <Text style={styles.verifyHint} testID="upload-note">{uploadNote}</Text>}
      </View>

      {/* ── Travel preferences ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Travel preferences</Text>
        <Text style={styles.sectionSubtitle}>
          Let passengers know what to expect
        </Text>
        <View style={styles.prefsGrid} testID="prefs-grid">
          {(Object.keys(prefs) as Array<keyof TravelPreferences>).map((key) => (
            <PrefChip
              key={key}
              label={PREF_LABELS[key]}
              selected={prefs[key]}
              onPress={() => togglePref(key)}
              testID={`pref-${key}`}
            />
          ))}
        </View>
      </View>

      {/* ── Save error ────────────────────────────────────────────────────────── */}
      {saveError ? (
        <Text style={styles.errorText} testID="save-error">{saveError}</Text>
      ) : null}

      {/* ── Save button ───────────────────────────────────────────────────────── */}
      <Button
        title={isSaving ? 'Saving…' : 'Save changes'}
        onPress={handleSave}
        disabled={isSaving || universityMissing}
        style={styles.saveButton}
        testID="save-button"
      />
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
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  screenTitle: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },

  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  photoHint: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },

  section: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  prefsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // PrefChip styles
  prefChip: {
    height: PREF_CHIP_HEIGHT,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefChipSelected: {
    backgroundColor: PREF_CHIP_SELECTED_BG,
  },
  prefChipLabel: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    lineHeight: 17,
    color: Colors.primary,
  },
  prefChipLabelSelected: {
    color: PREF_CHIP_SELECTED_TXT,
  },

  centeredInput: {
    textAlign: 'center',
  },
  requiredHint: {
    ...Typography.bodySmall,
    color: Colors.sos,
    marginTop: Spacing.xs,
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  verifyLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  verifyStatus: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.medium,
  },
  verifyHint: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  uploadBtnText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },

  errorText: {
    ...Typography.bodySmall,
    color: Colors.sos,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },

  saveButton: {
    marginTop: Spacing.sm,
  },
});
