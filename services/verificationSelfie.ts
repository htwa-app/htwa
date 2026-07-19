/**
 * services/verificationSelfie.ts
 *
 * Live-selfie capture + upload for identity verification (2A-b).
 * The stored photo is what booked passengers see on the "Verify your driver"
 * panel, so it must be a LIVE camera capture (services/imagePicker enforces
 * camera-only) and never the ID document image.
 *
 * Versioned path per upload (same rationale as studentCard.ts): a failed DB
 * write removes only the new orphaned file, never a previously-good selfie.
 */

import { supabase } from '../lib/supabase';

export type SelfieResult =
  | { ok: true; path: string }
  | { ok: false; reason: 'cancelled' | 'upload_failed' | 'save_failed'; message?: string };

export async function uploadVerificationSelfie(
  userId: string,
  selfieBytes: Uint8Array | null,
): Promise<SelfieResult> {
  if (!selfieBytes) return { ok: false, reason: 'cancelled' };

  const path = `${userId}/selfie-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('verification-selfies')
    .upload(path, selfieBytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) {
    return { ok: false, reason: 'upload_failed', message: uploadError.message };
  }

  const { data, error: dbError } = await supabase
    .from('verification')
    .upsert(
      { user_id: userId, selfie_url: path, selfie_verified: true },
      { onConflict: 'user_id' },
    )
    .select('user_id');
  if (dbError || !data || data.length === 0) {
    // The file is uploaded but the DB write failed — remove ONLY the newly
    // uploaded (versioned, orphaned) file; any previous selfie is untouched.
    const { error: removeError } = await supabase.storage.from('verification-selfies').remove([path]);
    if (removeError) console.error('[VerificationSelfie] orphan cleanup failed:', removeError.message);
    return { ok: false, reason: 'save_failed', message: dbError?.message };
  }

  return { ok: true, path };
}
