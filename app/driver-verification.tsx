/**
 * app/driver-verification.tsx
 *
 * Driver verification screen (round-2 fix #2). Collects everything a driver
 * must provide before posting journeys:
 *   - driving licence photo (library picker — review-only, never shown to users)
 *   - live selfie (in-app CAMERA capture only — this is the disclosure photo)
 *   - car photo with the registration plate clearly visible (review-only)
 *   - car make / model / registration / colour (all required)
 *
 * Submission enters manual review (pending → approved/rejected, student-card
 * model); the entered registration is cross-checked against the car photo at
 * review time. Posting stays blocked (UI + DB trigger) until approved.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  getDriverVerification,
  submitDriverVerification,
} from '../services/driverVerification';
import { captureVerificationSelfie, pickCarPhoto, pickLicencePhoto } from '../services/imagePicker';
import type { DriverVerificationRow } from '../types/database';

type PhotoKey = 'licence' | 'selfie' | 'car';

const PHOTO_TILES: Array<{ key: PhotoKey; icon: string; title: string; hint: string }> = [
  {
    key: 'licence', icon: 'card-outline', title: 'Driving licence',
    hint: 'A clear photo of your licence. Used for verification only — never shown to passengers.',
  },
  {
    key: 'selfie', icon: 'camera-outline', title: 'Live selfie',
    hint: 'Taken with your camera now — this is the photo passengers use to verify it\'s you.',
  },
  {
    key: 'car', icon: 'car-outline', title: 'Your car, plate visible',
    hint: 'The registration plate must be clearly readable. Used for verification only.',
  },
];

export default function DriverVerificationScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [existing, setExisting] = useState<DriverVerificationRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [registration, setRegistration] = useState('');
  const [colour, setColour] = useState('');
  const [photos, setPhotos] = useState<Record<PhotoKey, Uint8Array | null>>({
    licence: null, selfie: null, car: null,
  });
  // __DEV__ only: true when the selfie came from the library fallback
  // (simulator has no camera) rather than a live capture.
  const [selfieDevFallback, setSelfieDevFallback] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<PhotoKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await getDriverVerification(user.id);
      if (!res.ok) { setLoadError(true); return; }
      setExisting(res.verification);
      if (res.verification) {
        setMake(res.verification.car_make);
        setModel(res.verification.car_model);
        setRegistration(res.verification.car_registration);
        setColour(res.verification.car_colour);
      }
    } catch {
      // getDriverVerification already catches internally and returns
      // { ok: false } — this guards against anything unexpected still
      // escaping, so a rejection can't leave the screen showing the normal
      // empty-form state instead of the error state.
      setLoadError(true);
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
        if (selfie) {
          setPhotos((prev) => ({ ...prev, selfie: selfie.bytes }));
          setSelfieDevFallback(selfie.source === 'library-dev-fallback');
        }
        return;
      }
      const bytes = key === 'licence' ? await pickLicencePhoto() : await pickCarPhoto();
      if (bytes) setPhotos((prev) => ({ ...prev, [key]: bytes }));
    } catch {
      setError('Could not open the camera or photo picker. Check permissions in Settings.');
    } finally {
      setPhotoBusy(null);
    }
  };

  const photoDone = (key: PhotoKey): boolean =>
    !!photos[key] || (!!existing && key === 'licence' ? !!existing.licence_photo_path
      : !!existing && key === 'selfie' ? !!existing.selfie_photo_path
      : !!existing && key === 'car' ? !!existing.car_photo_path
      : false);

  const fieldsComplete = !!make.trim() && !!model.trim() && !!registration.trim() && !!colour.trim();
  const photosComplete = (['licence', 'selfie', 'car'] as PhotoKey[]).every(photoDone);
  const canSubmit = fieldsComplete && photosComplete && !isSubmitting;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await submitDriverVerification(
        user.id,
        { make, model, registration, colour },
        { licenceBytes: photos.licence, selfieBytes: photos.selfie, carBytes: photos.car },
        existing,
      );
      if (!res.ok) { setError(res.message); return; }
      setExisting(res.verification);
      setPhotos({ licence: null, selfie: null, car: null });
      setSelfieDevFallback(false);
    } catch {
      setError('Could not submit your driver verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center} testID="driver-verification-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center} testID="driver-verification-load-error">
        <Text style={styles.errorText}>Couldn't load your driver verification.</Text>
        <TouchableOpacity onPress={load} accessibilityRole="button" testID="driver-verification-retry">
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = existing?.status ?? null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]} testID="driver-verification-screen">
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
        <Text style={styles.title}>Driver verification</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Status banner */}
      {status === 'pending' && (
        <View style={[styles.statusBanner, styles.statusPending]} testID="status-pending">
          <Ionicons name="time-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.statusText}>
            Under review — we'll let you know as soon as you're approved. You can update your details below; edits re-enter review.
          </Text>
        </View>
      )}
      {status === 'approved' && (
        <View style={[styles.statusBanner, styles.statusApproved]} testID="status-approved">
          <Ionicons name="checkmark-circle" size={18} color={Colors.verified} />
          <Text style={styles.statusText}>
            You're approved to offer journeys. Changing anything below re-enters review and pauses posting until re-approved.
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
      {status === null && (
        <Text style={styles.subtitle}>
          To offer journeys you need to verify who you are and what you drive.
          Passengers see your selfie, name and car details — your licence and car
          photo are used for verification only.
        </Text>
      )}

      {/* Photo tiles */}
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
                  : tile.key === 'selfie' && fresh && selfieDevFallback ? '(dev fallback) Picked from library — no camera on this device'
                  : fresh ? 'New photo ready to submit'
                  : done ? 'On file — tap to replace'
                  : tile.hint}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Car fields */}
      <View style={styles.fieldCard}>
        <Text style={styles.fieldLabel}>Make</Text>
        <Input placeholder="e.g. Toyota" value={make} onChangeText={setMake} autoCapitalize="words" testID="dv-make" />
        <Text style={styles.fieldLabel}>Model</Text>
        <Input placeholder="e.g. Corolla" value={model} onChangeText={setModel} autoCapitalize="words" testID="dv-model" />
        <Text style={styles.fieldLabel}>Registration</Text>
        <Input placeholder="e.g. 191-D-12345" value={registration} onChangeText={setRegistration} autoCapitalize="characters" testID="dv-registration" />
        <Text style={styles.fieldLabel}>Colour</Text>
        <Input placeholder="e.g. Silver" value={colour} onChangeText={setColour} autoCapitalize="words" testID="dv-colour" />
        <Text style={styles.crossCheckNote}>
          We cross-check the registration you enter against your car photo during review.
        </Text>
      </View>

      {error && <Text style={styles.errorText} testID="dv-error">{error}</Text>}

      <Button
        title={isSubmitting ? 'Submitting…' : existing ? 'Resubmit for review' : 'Submit for review'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        testID="dv-submit"
      />
      {!canSubmit && !isSubmitting && (
        <Text style={styles.incompleteHint} testID="dv-incomplete-hint">
          {photosComplete ? 'Fill in all four car details to submit.' : 'All three photos and all four car details are required.'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    // paddingTop is set inline (insets.top + Spacing.lg) so the content clears
    // the status bar/Dynamic Island on every device instead of a fixed value.
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.md,
  },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
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
  crossCheckNote: { ...Typography.bodySmall, color: Colors.textTertiary },

  errorText: { ...Typography.bodySmall, color: Colors.sos, textAlign: 'center' },
  link: { ...Typography.bodyMedium, color: Colors.primary },
  incompleteHint: { ...Typography.bodySmall, color: Colors.textTertiary, textAlign: 'center' },
});
