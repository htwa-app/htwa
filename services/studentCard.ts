/**
 * services/studentCard.ts
 *
 * Block 6 — university verification via a student-card photo.
 *
 * The name on the student card must match the name on the government ID used at
 * registration. Automated extraction of the name from the photo requires OCR,
 * which is NOT built yet — so on upload we set the status to `pending` and a
 * human reviews it (manual-review flag).
 *
 * `namesLooselyMatch` is provided for the eventual automated path (and to assist
 * a manual reviewer); it is pure and unit-tested.
 *
 * TODO: add OCR (e.g. an Edge Function calling a vision API) to read the card
 *       name and auto-run namesLooselyMatch → set 'verified' / 'rejected'.
 */

import { supabase } from '../lib/supabase';
import type { UniversityVerificationStatus } from '../types/database';

/** Lowercase, strip accents + punctuation, collapse whitespace. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z\s]/g, ' ')          // drop punctuation/digits
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Loose match: identical after normalisation, OR every token of the shorter
 * name appears in the longer (handles middle names / ordering differences).
 */
export function namesLooselyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = new Set(na.split(' '));
  const tb = new Set(nb.split(' '));
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  return [...small].every((t) => big.has(t));
}

export interface UploadStudentCardResult {
  ok: boolean;
  status: UniversityVerificationStatus;
  path?: string;
  error?: string;
}

/**
 * Upload a student-card image to the private `student-cards` bucket (under the
 * user's own folder) and mark the profile as `pending` manual review.
 */
export async function uploadStudentCard(
  userId: string,
  fileBytes: ArrayBuffer | Uint8Array,
  contentType = 'image/jpeg',
): Promise<UploadStudentCardResult> {
  const path = `${userId}/student-card.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('student-cards')
    .upload(path, fileBytes, { contentType, upsert: true });
  if (uploadError) return { ok: false, status: 'unverified', error: uploadError.message };

  // Manual review: OCR isn't built, so we cannot auto-confirm the name match.
  // Upsert (not update) so a missing profile row can't make this silently report
  // success with zero rows affected.
  const { error: dbError } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, student_card_url: path, university_verification_status: 'pending' },
      { onConflict: 'user_id' },
    );
  if (dbError) {
    // The file is uploaded but the DB write failed — remove the orphaned upload.
    await supabase.storage.from('student-cards').remove([path]);
    return { ok: false, status: 'unverified', error: dbError.message };
  }

  return { ok: true, status: 'pending', path };
}
