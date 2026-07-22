/**
 * services/imagePicker.ts
 *
 * Image acquisition (expo-image-picker, installed 19 Jul 2026):
 *  - pickStudentCardImage: photo-library picker for the student-card upload.
 *  - captureVerificationSelfie: CAMERA-ONLY live capture for the verification
 *    selfie (2A-b) — deliberately no library option, the disclosure photo must
 *    be a live capture, never an uploaded/ID-document image.
 *  - pickProfilePhoto: library picker for the profile avatar.
 *
 * All return raw bytes (ready for supabase.storage upload) or null when the
 * user cancels / denies permission. Permission denial resolves null rather
 * than throwing so calling screens show their "photo unavailable" state.
 *
 * Simulator dev fallback (round-2, hands-on testing): iOS Simulators have no
 * camera hardware — expo-image-picker's launchCameraAsync throws ("Camera not
 * available on simulator"), which otherwise hard-blocks every camera-only
 * flow (identity selfie, driver verification) on the simulator. In __DEV__
 * builds ONLY, that thrown error is caught and captureVerificationSelfie
 * falls back to the photo library instead, tagging the result
 * `source: 'library-dev-fallback'` so calling screens can label it clearly.
 * Outside __DEV__ the error is rethrown unchanged — camera-only stays
 * enforced in production, no exceptions.
 */

import * as ImagePicker from 'expo-image-picker';

function bytesFromBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pickFromLibrary(aspect: [number, number] | undefined): Promise<Uint8Array | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!aspect,
    aspect,
    quality: 0.8,
    base64: true,
  });
  const base64 = res.canceled ? null : res.assets[0]?.base64 ?? null;
  return base64 ? bytesFromBase64(base64) : null;
}

/** Student-card image from the photo library. */
export async function pickStudentCardImage(): Promise<Uint8Array | null> {
  return pickFromLibrary(undefined);
}

/** Driving licence photo (driver verification — review-only, never shown to users). */
export async function pickLicencePhoto(): Promise<Uint8Array | null> {
  return pickFromLibrary(undefined);
}

/** Any government photo ID (identity verification — review-only, never shown to other users). */
export async function pickIdentityDocument(): Promise<Uint8Array | null> {
  return pickFromLibrary(undefined);
}

/** Car photo with the registration plate visible (driver verification — review-only). */
export async function pickCarPhoto(): Promise<Uint8Array | null> {
  return pickFromLibrary(undefined);
}

/** Profile photo from the library (square-cropped). */
export async function pickProfilePhoto(): Promise<Uint8Array | null> {
  return pickFromLibrary([1, 1]);
}

export interface SelfieCaptureResult {
  bytes: Uint8Array;
  /** 'library-dev-fallback' when the simulator's missing camera forced a
   *  __DEV__-only library pick instead of a live capture. Screens must label
   *  this state clearly — it is never available outside __DEV__. */
  source: 'camera' | 'library-dev-fallback';
}

/**
 * LIVE selfie capture for identity verification (front camera, no library
 * fallback in production — the disclosure photo shown to passengers must be
 * live-captured). See file header for the __DEV__ simulator fallback.
 */
export async function captureVerificationSelfie(): Promise<SelfieCaptureResult | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  try {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    const base64 = res.canceled ? null : res.assets[0]?.base64 ?? null;
    return base64 ? { bytes: bytesFromBase64(base64), source: 'camera' } : null;
  } catch (e) {
    // Real camera failures (hardware fault, unexpected native error) must
    // still surface in production — only __DEV__ treats "no camera" as a
    // reason to fall back rather than fail.
    if (!__DEV__) throw e;
    console.warn(
      '[ImagePicker] Camera capture failed — __DEV__ fallback to photo library (simulator has no camera):',
      e instanceof Error ? e.message : e,
    );
    const bytes = await pickFromLibrary(undefined);
    return bytes ? { bytes, source: 'library-dev-fallback' } : null;
  }
}
