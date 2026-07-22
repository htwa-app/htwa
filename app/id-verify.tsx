/**
 * app/id-verify.tsx
 *
 * Universal identity verification (19 Jul safety follow-up) — every user,
 * not just drivers, confirms date of birth and provides a photo ID (any
 * government-issued document) plus a live selfie, then waits for manual
 * review (pending → approved/rejected, same review model as driver
 * verification). Reachable two ways:
 *   - Mandatory first-time gate: SplashScreen/authRouting sends a brand-new
 *     user here before anything else. Submitting (not approval) unlocks the
 *     rest of the app — browsing/search work immediately while pending;
 *     only booking a seat or posting a journey requires 'approved'.
 *   - Voluntary re-visit via Settings, to check status or resubmit after a
 *     rejection.
 *
 * The photo-ID document is review-only and NEVER shown to other users; the
 * selfie is the disclosure photo booked passengers see on the driver-verify
 * panel (unchanged from before).
 *
 * Note on the DOB field: DateTimeField's generic "Done always commits the
 * wheel's current value" is correct for a journey date/time (today/now is a
 * legitimate answer), but nobody's real birthdate is sensibly "today" — the
 * field opens defaulting there if never touched. Since MIN_AGE below is a
 * real eligibility gate (not just a sanity check), an untouched-Done DOB of
 * "today" simply fails it and blocks submission with the standard message —
 * no separate plausibility floor is needed.
 *
 * 19 Jul (age-gate follow-up): self-reported DOB is enforced here AND at the
 * DB layer (see the CHECK constraint added in the age-gate migration); Jordan
 * additionally cross-checks the submitted DOB against the photo ID by hand
 * during manual review, same as every other verification field.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { DateTimeField } from '../components/DateTimeField';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getIdentityVerification,
  submitIdentityVerification,
} from '../services/identityVerification';
import { captureVerificationSelfie, pickIdentityDocument } from '../services/imagePicker';
import { resolvePostAuthDestination } from '../utils/authRouting';
import type { VerificationRow } from '../types/database';

type PhotoKey = 'idDocument' | 'selfie';

const PHOTO_TILES: Array<{ key: PhotoKey; icon: string; title: string; hint: string }> = [
  {
    key: 'idDocument', icon: 'card-outline', title: 'Photo ID',
    hint: 'Passport, driving licence, or national ID card. Used for verification only — never shown to other users.',
  },
  {
    key: 'selfie', icon: 'camera-outline', title: 'Live selfie',
    hint: 'Taken with your camera now — this is the photo other users see to confirm it\'s really you.',
  },
];

const MIN_AGE = 18; // real eligibility gate (19 Jul) — also enforced by a DB CHECK constraint

function ageFromDOB(dob: string): number {
  const birth = new Date(`${dob}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export default function IdVerifyScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading, refreshVerification } = useAuth();

  const [existing, setExisting] = useState<VerificationRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dob, setDob] = useState('');
  const [photos, setPhotos] = useState<Record<PhotoKey, Uint8Array | null>>({
    idDocument: null, selfie: null,
  });
  const [photoBusy, setPhotoBusy] = useState<PhotoKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Safety guard — should not happen in normal flow ────────────────────────
  useEffect(() => {
    if (!authLoading && user === null) router.replace('/login');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await getIdentityVerification(user.id);
      if (!res.ok) { setLoadError(true); return; }
      setExisting(res.verification);
      if (res.verification?.date_of_birth) setDob(res.verification.date_of_birth);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const capturePhoto = async (key: PhotoKey) => {
    setPhotoBusy(key);
    setError(null);
    try {
      if (key === 'selfie') {
        const selfie = await captureVerificationSelfie();
        if (selfie) setPhotos((prev) => ({ ...prev, selfie: selfie.bytes }));
        return;
      }
      const bytes = await pickIdentityDocument();
      if (bytes) setPhotos((prev) => ({ ...prev, idDocument: bytes }));
    } catch {
      setError('Could not open the camera or photo picker. Check permissions in Settings.');
    } finally {
      setPhotoBusy(null);
    }
  };

  const photoDone = (key: PhotoKey): boolean =>
    !!photos[key] || (key === 'idDocument' ? !!existing?.id_document_path : !!existing?.selfie_url);

  const dobParsed = dob.length > 0 ? new Date(`${dob}T00:00:00`) : null;
  const dobFormatValid = dobParsed !== null && !Number.isNaN(dobParsed.getTime()) && dobParsed <= new Date();
  const dobUnderage = dobFormatValid && ageFromDOB(dob) < MIN_AGE;
  const dobPlausible = dobFormatValid && !dobUnderage;
  const photosComplete = (['idDocument', 'selfie'] as PhotoKey[]).every(photoDone);
  const canSubmit = dobPlausible && photosComplete && !isSubmitting;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await submitIdentityVerification(
        user.id,
        { dateOfBirth: dob },
        { idDocumentBytes: photos.idDocument, selfieBytes: photos.selfie },
        existing,
      );
      if (!res.ok) { setError(res.message); return; }
      setExisting(res.verification);
      setPhotos({ idDocument: null, selfie: null });

      // Submitting (not approval) unlocks the rest of the app — proceed via
      // the same routing precedence verify.tsx uses after OTP, so a
      // first-time submission and a later resubmit both land in the right
      // place (profile-setup if that's still missing, otherwise tabs).
      // A failed profile lookup must not read as "no profile" — that would
      // send an already-set-up user through /profile-setup unnecessarily.
      // This is a secondary lookup after the verification submission has
      // already committed (CLAUDE.md §12 rule 6): log it and default to the
      // less disruptive destination (tabs) rather than blocking on a retry
      // UI for what's normally a fast, reliable query.
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
      if (profileErr) console.error('[IdVerify] profile lookup failed, defaulting to /(tabs):', profileErr.message);
      const hasProfile = profileErr ? true : profileRow !== null;
      await refreshVerification();
      router.replace(resolvePostAuthDestination({ verificationStatus: res.verification.status, hasProfile }));
    } catch {
      setError('Could not submit your verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center} testID="id-verify-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center} testID="id-verify-load-error">
        <Text style={styles.errorText}>Couldn't load your verification status.</Text>
        <TouchableOpacity onPress={load} accessibilityRole="button" testID="id-verify-retry">
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = existing?.status ?? null;
  const maxDob = new Date();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
      testID="id-verify-screen"
    >
      <Text style={styles.title}>Verify your identity</Text>

      {status === null && (
        <Text style={styles.subtitle}>
          We need to confirm your identity before you can use htwa. This is a
          one-time step that keeps everyone on the platform safe — you can
          look around straight after submitting; booking or posting a journey
          needs your verification approved first.
        </Text>
      )}
      {status === 'pending' && (
        <View style={[styles.statusBanner, styles.statusPending]} testID="status-pending">
          <Ionicons name="time-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.statusText}>
            Under review — you can already browse and search. Booking or
            posting a journey unlocks once you're approved. You can update
            your details below; edits re-enter review.
          </Text>
        </View>
      )}
      {status === 'approved' && (
        <View style={[styles.statusBanner, styles.statusApproved]} testID="status-approved">
          <Ionicons name="checkmark-circle" size={18} color={Colors.verified} />
          <Text style={styles.statusText}>
            You're verified. Changing anything below re-enters review and
            pauses booking/posting until you're re-approved.
          </Text>
        </View>
      )}
      {status === 'rejected' && (
        <View style={[styles.statusBanner, styles.statusRejected]} testID="status-rejected">
          <Ionicons name="alert-circle" size={18} color={Colors.sos} />
          <Text style={styles.statusText}>
            {existing?.review_note
              ? `Not approved: ${existing.review_note} Fix the issue and resubmit.`
              : 'Not approved. Check your details and photos, then resubmit.'}
          </Text>
        </View>
      )}

      {PHOTO_TILES.map((tile) => {
        const done = photoDone(tile.key);
        const fresh = !!photos[tile.key];
        return (
          <TouchableOpacity
            key={tile.key}
            style={[styles.photoTile, done && styles.photoTileDone]}
            onPress={() => void capturePhoto(tile.key)}
            disabled={photoBusy !== null}
            accessibilityRole="button"
            accessibilityLabel={tile.title}
            testID={`photo-${tile.key}`}
          >
            <Ionicons
              name={done ? 'checkmark-circle' : (tile.icon as 'card-outline')}
              size={24}
              color={done ? Colors.verified : Colors.primary}
            />
            <View style={styles.flex}>
              <Text style={styles.photoTitle}>{tile.title}</Text>
              <Text style={styles.photoHint}>
                {photoBusy === tile.key ? 'Opening…'
                  : fresh ? 'New photo ready to submit'
                  : done ? 'On file — tap to replace'
                  : tile.hint}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.fieldCard}>
        <Text style={styles.fieldLabel}>Date of birth</Text>
        <DateTimeField
          mode="date"
          value={dob}
          onChange={setDob}
          placeholder="Pick your date of birth"
          maximumDate={maxDob}
          testID="dob-field"
        />
        {dob.length > 0 && dobUnderage && (
          <Text style={styles.errorText} testID="dob-underage">
            You must be 18 or older to use htwa.
          </Text>
        )}
        {dob.length > 0 && !dobFormatValid && (
          <Text style={styles.errorText} testID="dob-implausible">
            That doesn't look like a valid date of birth — please check it.
          </Text>
        )}
      </View>

      {error && <Text style={styles.errorText} testID="id-verify-message">{error}</Text>}

      <Button
        title={isSubmitting ? 'Submitting…' : existing ? 'Resubmit for review' : 'Submit for review'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        testID="id-verify-submit"
      />
      {!canSubmit && !isSubmitting && (
        <Text style={styles.incompleteHint} testID="id-verify-incomplete-hint">
          {photosComplete ? 'Pick a valid date of birth to submit.' : 'A photo ID, a live selfie, and your date of birth are all required.'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    // paddingTop is set inline (insets.top + Spacing.lg) so the title clears
    // the status bar/Dynamic Island on every device instead of a fixed value.
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.md,
  },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  title: { ...Typography.displayMedium, color: Colors.textPrimary },
  subtitle: { ...Typography.bodyMedium, color: Colors.textSecondary },

  statusBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderRadius: BorderRadius.large, padding: Spacing.cardPadding,
  },
  statusPending: { backgroundColor: Colors.amberLight },
  statusApproved: { backgroundColor: Colors.primaryLight },
  statusRejected: { backgroundColor: '#FDECEC' }, // sos-tinted background — not in §1 palette
  statusText: { ...Typography.bodySmall, color: Colors.textPrimary, flex: 1 },

  photoTile: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card,
    padding: Spacing.cardPadding,
  },
  photoTileDone: { borderColor: Colors.verified },
  photoTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  photoHint: { ...Typography.bodySmall, color: Colors.textTertiary },

  fieldCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  fieldLabel: { ...Typography.bodySmall, color: Colors.textSecondary },

  errorText: { ...Typography.bodyMedium, color: Colors.sos },
  link: { ...Typography.bodyMedium, color: Colors.primary },
  incompleteHint: { ...Typography.bodySmall, color: Colors.textTertiary, textAlign: 'center' },
});
