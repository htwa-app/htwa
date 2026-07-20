/**
 * services/imagePicker.ts
 *
 * Block 6 — image acquisition for the student-card upload.
 *
 * ⚠️ STUB: `expo-image-picker` is a NATIVE module and is not yet installed.
 *    Installing it requires a fresh EAS build (it cannot be added over OTA).
 *    Until then `pickStudentCardImage` resolves to `null` so the rest of the
 *    flow (upload → pending status) is fully wired and testable behind it.
 *
 * TODO: `npx expo install expo-image-picker`, then implement:
 *   const res = await ImagePicker.launchImageLibraryAsync({ base64: true, ... });
 *   return res.canceled ? null : bytesFromBase64(res.assets[0].base64);
 */

export async function pickStudentCardImage(): Promise<Uint8Array | null> {
  // Native picker not available yet — see file header.
  return null;
}
