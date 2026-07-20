/**
 * services/identityVerification.ts
 *
 * Universal identity verification (19 Jul, safety follow-up): every user —
 * not just drivers — must confirm date of birth and provide a photo ID
 * (any government-issued document) plus a live selfie, then wait for manual
 * review (pending → approved/rejected, same model as driver_verifications).
 *
 * Photo routing:
 *  - id_document_path → 'identity-documents' bucket (owner + service only,
 *    review-only, NEVER shown to other users)
 *  - selfie_url → 'verification-selfies' bucket (the disclosure photo shown
 *    to booked passengers on the driver-verify panel)
 *
 * Submitting/updating is mandatory before using anything else in the app
 * (routing gate, unchanged); once submitted, browsing unlocks immediately —
 * only booking a seat / posting a journey requires status = 'approved',
 * enforced both here (fail-loud) and by the book_ride / rides DB triggers.
 *
 * Supersedes the narrower services/verificationSelfie.ts (deleted — this
 * covers everything it did plus the ID document + DOB).
 */

import { supabase } from '../lib/supabase';
import type { VerificationRow } from '../types/database';

export type IdentityVerificationResult =
  | { ok: true; verification: VerificationRow | null }
  | { ok: false };

export async function getIdentityVerification(userId: string): Promise<IdentityVerificationResult> {
  try {
    const { data, error } = await supabase
      .from('verification')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { ok: false };
    return { ok: true, verification: data ?? null };
  } catch {
    return { ok: false };
  }
}

export interface IdentitySubmission {
  dateOfBirth: string; // YYYY-MM-DD
}

export interface IdentityPhotos {
  /** Required on first submission; optional on resubmit (keeps the stored photo). */
  idDocumentBytes?: Uint8Array | null;
  selfieBytes?: Uint8Array | null;
}

export type SubmitResult =
  | { ok: true; verification: VerificationRow }
  | { ok: false; message: string };

async function uploadTo(
  bucket: string,
  path: string,
  bytes: Uint8Array,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function submitIdentityVerification(
  userId: string,
  fields: IdentitySubmission,
  photos: IdentityPhotos,
  existing: VerificationRow | null,
): Promise<SubmitResult> {
  if (!fields.dateOfBirth) {
    return { ok: false, message: 'Date of birth is required.' };
  }

  try {
    const ts = Date.now();
    const uploadedPaths: Array<{ bucket: string; path: string }> = [];

    let idDocPath = existing?.id_document_path ?? null;
    if (photos.idDocumentBytes) {
      const path = `${userId}/id-${ts}.jpg`;
      const up = await uploadTo('identity-documents', path, photos.idDocumentBytes);
      if (!up.ok) return { ok: false, message: 'Could not upload your ID document. Please try again.' };
      uploadedPaths.push({ bucket: 'identity-documents', path });
      idDocPath = path;
    }

    let selfiePath = existing?.selfie_url ?? null;
    if (photos.selfieBytes) {
      const path = `${userId}/selfie-${ts}.jpg`;
      const up = await uploadTo('verification-selfies', path, photos.selfieBytes);
      if (!up.ok) return { ok: false, message: 'Could not upload your selfie. Please try again.' };
      uploadedPaths.push({ bucket: 'verification-selfies', path });
      selfiePath = path;
    }

    if (!idDocPath || !selfiePath) {
      return { ok: false, message: 'A photo ID and a live selfie are both required.' };
    }

    const { data, error } = await supabase
      .from('verification')
      .upsert(
        {
          user_id: userId,
          id_document_path: idDocPath,
          selfie_url: selfiePath,
          date_of_birth: fields.dateOfBirth,
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();
    if (error || !data) {
      for (const { bucket, path } of uploadedPaths) {
        const { error: removeError } = await supabase.storage.from(bucket).remove([path]);
        if (removeError) console.error('[IdentityVerification] orphan cleanup failed:', removeError.message);
      }
      return { ok: false, message: 'Could not submit your verification. Please try again.' };
    }

    return { ok: true, verification: data };
  } catch {
    return { ok: false, message: 'Could not submit your verification. Please try again.' };
  }
}
