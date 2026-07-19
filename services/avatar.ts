/**
 * services/avatar.ts
 *
 * Profile photo upload + display URL. Paths are versioned per upload
 * ({userId}/avatar-{ts}.jpg in the private 'avatars' bucket) so a failed DB
 * write can only orphan the new file, never clobber the previous photo.
 * Display goes through short-lived signed URLs (bucket is not public).
 */

import { supabase } from '../lib/supabase';

export type AvatarUploadResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

export async function uploadAvatar(userId: string, bytes: Uint8Array): Promise<AvatarUploadResult> {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) return { ok: false, message: uploadError.message };

  const { data, error: dbError } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, avatar_url: path }, { onConflict: 'user_id' })
    .select('user_id');
  if (dbError || !data || data.length === 0) {
    const { error: removeError } = await supabase.storage.from('avatars').remove([path]);
    if (removeError) console.error('[Avatar] orphan cleanup failed:', removeError.message);
    return { ok: false, message: dbError?.message ?? 'Could not save your photo.' };
  }
  return { ok: true, path };
}

/** Signed display URL for an avatar path; null when unavailable (show initials). */
export async function getAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    if (error) {
      console.error('[Avatar] sign failed:', error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
