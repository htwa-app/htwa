/**
 * services/driverVerification.ts
 *
 * Driver verification (round-2 fix #2): before posting any journey a driver
 * must submit a driving-licence photo, a live in-app selfie, a car photo with
 * the registration plate visible, and the car's make/model/registration/
 * colour — then be manually APPROVED (student-card review model).
 *
 * Photo routing (privacy-policy.md §2.2):
 *  - licence + car photos → 'driver-verifications' bucket (owner + service
 *    role only; review-only, never shown to other users)
 *  - the live selfie → 'verification-selfies' bucket (it IS the photo booked
 *    passengers see on the "Verify your driver" panel)
 *
 * The DB is the real wall: rides INSERT is rejected by trigger
 * ('driver_not_approved') without an approved row, and any owner write is
 * forced back to 'pending' for re-review. Fail-loud per CLAUDE.md §12 —
 * a query error is never reported as "no verification yet".
 */

import { supabase } from '../lib/supabase';
import type { DriverVerificationRow } from '../types/database';

export type DriverVerificationResult =
  | { ok: true; verification: DriverVerificationRow | null }
  | { ok: false };

export async function getDriverVerification(userId: string): Promise<DriverVerificationResult> {
  try {
    const { data, error } = await supabase
      .from('driver_verifications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { ok: false };
    return { ok: true, verification: data ?? null };
  } catch {
    return { ok: false };
  }
}

export interface DriverVerificationFields {
  make: string;
  model: string;
  registration: string;
  colour: string;
}

export interface DriverVerificationPhotos {
  /** Required on first submission; optional on resubmit (keeps the stored photo). */
  licenceBytes?: Uint8Array | null;
  selfieBytes?: Uint8Array | null;
  carBytes?: Uint8Array | null;
}

export type SubmitResult =
  | { ok: true; verification: DriverVerificationRow }
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

/** Remove every already-uploaded file for this submission attempt — called on
 *  ANY later failure (a subsequent upload, or the final upsert), so a partial
 *  attempt never leaves orphaned photos behind in storage. */
async function cleanupUploaded(uploadedPaths: Array<{ bucket: string; path: string }>): Promise<void> {
  for (const { bucket, path } of uploadedPaths) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.error('[DriverVerification] orphan cleanup failed:', error.message);
  }
}

/**
 * Submit (or resubmit) driver verification. Uploads any newly captured photos
 * to versioned paths, then upserts the record — the DB trigger forces status
 * back to 'pending' on every owner write, so edits always re-enter review.
 */
export async function submitDriverVerification(
  userId: string,
  fields: DriverVerificationFields,
  photos: DriverVerificationPhotos,
  existing: DriverVerificationRow | null,
): Promise<SubmitResult> {
  const make = fields.make.trim();
  const model = fields.model.trim();
  const registration = fields.registration.trim().toUpperCase();
  const colour = fields.colour.trim();
  if (!make || !model || !registration || !colour) {
    return { ok: false, message: 'Car make, model, registration and colour are all required.' };
  }

  try {
    const ts = Date.now();
    const uploadedPaths: Array<{ bucket: string; path: string }> = [];

    // Each photo: use the fresh capture if provided, else keep the stored one.
    let licencePath = existing?.licence_photo_path ?? null;
    if (photos.licenceBytes) {
      const path = `${userId}/licence-${ts}.jpg`;
      const up = await uploadTo('driver-verifications', path, photos.licenceBytes);
      if (!up.ok) {
        await cleanupUploaded(uploadedPaths);
        return { ok: false, message: 'Could not upload your licence photo. Please try again.' };
      }
      uploadedPaths.push({ bucket: 'driver-verifications', path });
      licencePath = path;
    }

    let selfiePath = existing?.selfie_photo_path ?? null;
    if (photos.selfieBytes) {
      const path = `${userId}/selfie-${ts}.jpg`;
      const up = await uploadTo('verification-selfies', path, photos.selfieBytes);
      if (!up.ok) {
        await cleanupUploaded(uploadedPaths);
        return { ok: false, message: 'Could not upload your selfie. Please try again.' };
      }
      uploadedPaths.push({ bucket: 'verification-selfies', path });
      selfiePath = path;
    }

    let carPath = existing?.car_photo_path ?? null;
    if (photos.carBytes) {
      const path = `${userId}/car-${ts}.jpg`;
      const up = await uploadTo('driver-verifications', path, photos.carBytes);
      if (!up.ok) {
        await cleanupUploaded(uploadedPaths);
        return { ok: false, message: 'Could not upload your car photo. Please try again.' };
      }
      uploadedPaths.push({ bucket: 'driver-verifications', path });
      carPath = path;
    }

    if (!licencePath || !selfiePath || !carPath) {
      await cleanupUploaded(uploadedPaths);
      return { ok: false, message: 'All three photos are required: driving licence, live selfie, and car with visible registration plate.' };
    }

    const { data, error } = await supabase
      .from('driver_verifications')
      .upsert(
        {
          user_id: userId,
          licence_photo_path: licencePath,
          selfie_photo_path: selfiePath,
          car_photo_path: carPath,
          car_make: make,
          car_model: model,
          car_registration: registration,
          car_colour: colour,
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();
    if (error || !data) {
      // Remove only the just-uploaded (versioned, orphaned) files — any
      // previously saved photos are untouched.
      await cleanupUploaded(uploadedPaths);
      return { ok: false, message: 'Could not submit your driver verification. Please try again.' };
    }

    // Keep the disclosure selfie reference in sync (legacy fallback path).
    if (photos.selfieBytes) {
      const { error: verifErr } = await supabase
        .from('verification')
        .upsert({ user_id: userId, selfie_url: selfiePath, selfie_verified: true }, { onConflict: 'user_id' });
      if (verifErr) console.error('[DriverVerification] verification selfie sync failed:', verifErr.message);
    }

    return { ok: true, verification: data };
  } catch {
    return { ok: false, message: 'Could not submit your driver verification. Please try again.' };
  }
}
