/**
 * supabase/functions/delete-account/index.ts
 *
 * Account deletion as ANONYMISE-IN-PLACE, exactly per Privacy Policy §7A
 * (pending adviser review): identifying details on the users/profiles/
 * verification rows are erased or replaced with non-identifying values;
 * journey history, payment records, messages and safety records are retained
 * in that anonymised form so the other side of every shared record stays
 * intact. The auth (GoTrue) user is then hard-deleted so sign-in is gone.
 *
 * Identity comes from the caller's JWT — a user can only delete themselves.
 *
 * Response: { ok: true } | { error }
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const svc = serviceHeaders();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!svc || !supabaseUrl) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const uid = user.id;

  // 1. Collect stored photos so they can be removed from storage.
  const pathsToRemove: Array<{ bucket: string; path: string }> = [];
  const profileRes = await fetch(
    supabaseRestUrl(`/profiles?user_id=eq.${uid}&select=avatar_url,student_card_url`),
    { headers: svc },
  );
  if (profileRes.ok) {
    const rows = await profileRes.json() as Array<{ avatar_url: string | null; student_card_url: string | null }>;
    if (rows[0]?.avatar_url) pathsToRemove.push({ bucket: 'avatars', path: rows[0].avatar_url });
    if (rows[0]?.student_card_url) pathsToRemove.push({ bucket: 'student-cards', path: rows[0].student_card_url });
  }
  const verifRes = await fetch(
    supabaseRestUrl(`/verification?user_id=eq.${uid}&select=selfie_url`),
    { headers: svc },
  );
  if (verifRes.ok) {
    const rows = await verifRes.json() as Array<{ selfie_url: string | null }>;
    if (rows[0]?.selfie_url) pathsToRemove.push({ bucket: 'verification-selfies', path: rows[0].selfie_url });
  }

  // 2. Anonymise users row in place (§7A). Email must stay unique → tombstone.
  const usersPatch = await fetch(supabaseRestUrl(`/users?id=eq.${uid}`), {
    method: 'PATCH',
    headers: { ...svc, Prefer: 'return=representation' },
    body: JSON.stringify({
      full_name: 'Deleted user',
      email: `deleted-${uid}@deleted.htwa-app.com`,
      phone: null,
      gender: null,
    }),
  });
  if (!usersPatch.ok || ((await usersPatch.json()) as unknown[]).length === 0) {
    console.error('[delete-account] users anonymise failed for', uid);
    return json({ error: 'Could not anonymise account' }, 500);
  }

  // 3. Clear identifying profile fields; keep the row (FK integrity).
  const profilePatch = await fetch(supabaseRestUrl(`/profiles?user_id=eq.${uid}`), {
    method: 'PATCH',
    headers: svc,
    body: JSON.stringify({
      bio: null,
      nominated_contact: null,
      vehicle_details: null,
      avatar_url: null,
      student_card_url: null,
      notification_prefs: {},
    }),
  });
  if (!profilePatch.ok) console.error('[delete-account] profiles clear failed:', await profilePatch.text());

  // 4. Clear the verification selfie reference.
  const verifPatch = await fetch(supabaseRestUrl(`/verification?user_id=eq.${uid}`), {
    method: 'PATCH',
    headers: svc,
    body: JSON.stringify({ selfie_url: null }),
  });
  if (!verifPatch.ok) console.error('[delete-account] verification clear failed:', await verifPatch.text());

  // 5. Remove stored photos (best-effort; rows are already anonymised).
  for (const { bucket, path } of pathsToRemove) {
    const del = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: 'DELETE',
      headers: svc,
    });
    if (!del.ok) console.error(`[delete-account] storage delete failed: ${bucket}/${path}`);
  }

  // 6. Remove any journey contacts this user nominated (their contacts'
  //    personal data was provided by them and serves no purpose now).
  const jcDel = await fetch(supabaseRestUrl(`/journey_contacts?user_id=eq.${uid}`), {
    method: 'DELETE',
    headers: svc,
  });
  if (!jcDel.ok) console.error('[delete-account] journey_contacts delete failed:', await jcDel.text());

  // 7. Hard-delete the auth user — sign-in gone; anonymised rows remain.
  const authDel = await fetch(`${supabaseUrl}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: svc,
  });
  if (!authDel.ok) {
    console.error('[delete-account] auth delete failed:', await authDel.text());
    return json({ error: 'Account anonymised but sign-in removal failed — contact support' }, 500);
  }

  return json({ ok: true });
});
