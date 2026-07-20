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

/** Profile photo from the library (square-cropped). */
export async function pickProfilePhoto(): Promise<Uint8Array | null> {
  return pickFromLibrary([1, 1]);
}

/**
 * LIVE selfie capture for identity verification (front camera, no library
 * fallback — the disclosure photo shown to passengers must be live-captured).
 */
export async function captureVerificationSelfie(): Promise<Uint8Array | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.front,
    allowsEditing: false,
    quality: 0.8,
    base64: true,
  });
  const base64 = res.canceled ? null : res.assets[0]?.base64 ?? null;
  return base64 ? bytesFromBase64(base64) : null;
}
