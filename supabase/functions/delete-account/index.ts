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

// This function makes ~8 sequential external calls (Supabase REST/Storage/
// Auth) with no shared code path to centralise a timeout in — a per-call
// AbortSignal keeps a slow/hung upstream from stalling the whole request
// indefinitely.
const REQUEST_TIMEOUT_MS = 8000;
const withTimeout = (init: RequestInit = {}): RequestInit => ({ ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const svc = serviceHeaders();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!svc || !supabaseUrl) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const uid = user.id;

  // Every external call below is wrapped in this try/catch: a timeout
  // (AbortSignal, via withTimeout) throws rather than hanging, and without
  // this the throw would otherwise escape uncaught instead of degrading to
  // a clean error response.
  try {
    // 1. Collect stored photos so they can be removed from storage.
    const pathsToRemove: Array<{ bucket: string; path: string }> = [];
    const profileRes = await fetch(
      supabaseRestUrl(`/profiles?user_id=eq.${uid}&select=avatar_url,student_card_url`),
      withTimeout({ headers: svc }),
    );
    if (profileRes.ok) {
      const rows = await profileRes.json() as Array<{ avatar_url: string | null; student_card_url: string | null }>;
      if (rows[0]?.avatar_url) pathsToRemove.push({ bucket: 'avatars', path: rows[0].avatar_url });
      if (rows[0]?.student_card_url) pathsToRemove.push({ bucket: 'student-cards', path: rows[0].student_card_url });
    }
    const verifRes = await fetch(
      supabaseRestUrl(`/verification?user_id=eq.${uid}&select=selfie_url`),
      withTimeout({ headers: svc }),
    );
    if (verifRes.ok) {
      const rows = await verifRes.json() as Array<{ selfie_url: string | null }>;
      if (rows[0]?.selfie_url) pathsToRemove.push({ bucket: 'verification-selfies', path: rows[0].selfie_url });
    }

    // 2. Anonymise users row in place (§7A). Email must stay unique → tombstone.
    const usersPatch = await fetch(supabaseRestUrl(`/users?id=eq.${uid}`), withTimeout({
      method: 'PATCH',
      headers: { ...svc, Prefer: 'return=representation' },
      body: JSON.stringify({
        full_name: 'Deleted user',
        email: `deleted-${uid}@deleted.htwa-app.com`,
        phone: null,
        gender: null,
      }),
    }));
    if (!usersPatch.ok || ((await usersPatch.json()) as unknown[]).length === 0) {
      console.error('[delete-account] users anonymise failed for', uid);
      return json({ error: 'Could not anonymise account' }, 500);
    }

    // 3. Clear identifying profile fields; keep the row (FK integrity).
    // Hard-fail here (like steps 2 and 7) rather than log-and-continue: step 7
    // below hard-deletes the auth user, and identity comes ONLY from the JWT —
    // once that's gone there is no way to re-authenticate and retry. Silently
    // leaving bio/nominated_contact/vehicle_details/avatar_url/student_card_url
    // un-anonymised while still returning { ok: true } would be unrecoverable PII
    // exposure, not a safe-to-ignore secondary side effect.
    const profilePatch = await fetch(supabaseRestUrl(`/profiles?user_id=eq.${uid}`), withTimeout({
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
    }));
    if (!profilePatch.ok) {
      console.error('[delete-account] profiles clear failed:', await profilePatch.text());
      return json({ error: 'Could not anonymise account (profile)' }, 500);
    }

    // 4. Clear the verification selfie reference. Same hard-fail reasoning as
    //    step 3 — a live selfie left behind is exactly the PII this exists to remove.
    const verifPatch = await fetch(supabaseRestUrl(`/verification?user_id=eq.${uid}`), withTimeout({
      method: 'PATCH',
      headers: svc,
      body: JSON.stringify({ selfie_url: null }),
    }));
    if (!verifPatch.ok) {
      console.error('[delete-account] verification clear failed:', await verifPatch.text());
      return json({ error: 'Could not anonymise account (verification)' }, 500);
    }

    // 5. Remove stored photos (best-effort; the DB rows no longer reference them
    //    as of steps 3-4, so a failure here only leaves an orphaned storage
    //    object, not a live, linked exposure — logging is sufficient).
    for (const { bucket, path } of pathsToRemove) {
      const del = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, withTimeout({
        method: 'DELETE',
        headers: svc,
      }));
      if (!del.ok) console.error(`[delete-account] storage delete failed: ${bucket}/${path}`);
    }

    // 6. Remove any journey contacts this user nominated (their contacts'
    //    personal data was provided by them and serves no purpose now). Hard-fail
    //    for the same reason as steps 3-4 — this is a nominated third party's
    //    name/phone number, not this user's own already-anonymised data.
    const jcDel = await fetch(supabaseRestUrl(`/journey_contacts?user_id=eq.${uid}`), withTimeout({
      method: 'DELETE',
      headers: svc,
    }));
    if (!jcDel.ok) {
      console.error('[delete-account] journey_contacts delete failed:', await jcDel.text());
      return json({ error: 'Could not anonymise account (nominated contacts)' }, 500);
    }

    // 7. Hard-delete the auth user — sign-in gone; anonymised rows remain.
    const authDel = await fetch(`${supabaseUrl}/auth/v1/admin/users/${uid}`, withTimeout({
      method: 'DELETE',
      headers: svc,
    }));
    if (!authDel.ok) {
      console.error('[delete-account] auth delete failed:', await authDel.text());
      return json({ error: 'Account anonymised but sign-in removal failed — contact support' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[delete-account] request failed:', err instanceof Error ? err.message : err);
    return json({ error: 'Account deletion timed out or failed — please try again' }, 500);
  }
});
