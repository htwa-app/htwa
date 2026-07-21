/**
 * supabase/functions/send-push/index.ts
 *
 * Sends a real push notification (killed/backgrounded app delivery) via
 * Expo's push service, which relays to FCM (Android) or APNs (iOS) using the
 * credentials attached through `eas credentials` — this function never talks
 * to Firebase/APNs directly, only to Expo's push API. Caller must be an
 * authenticated htwa user (any user may notify another, e.g. a passenger
 * booking triggers a push to the driver); the recipient is identified by
 * userId, and their Expo push token is looked up server-side via the service
 * role — a client never reads another user's token directly.
 *
 * Request body:
 *   { userId: string, title: string, body: string, data?: Record<string, unknown> }
 *
 * Response: { ok: true, sent: boolean, reason?: 'no_token' | 'ticket_error' }
 *           | { ok: false, error: string }
 *
 * Missing/invalid recipient token is NOT an error — mirrors the graceful
 * degradation pattern in send-tracking-alert (foreground local notification
 * already covers the open-app case; a push is a bonus, not the only channel).
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const FETCH_TIMEOUT_MS = 8000;

interface SendPushBody {
  userId?: string;
  title?:  string;
  body?:   string;
  data?:   Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let payload: SendPushBody;
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { userId, title, body, data } = payload;
  if (!userId || !title || !body) return json({ error: 'userId, title, and body are required' }, 400);

  const svc = serviceHeaders();
  if (!svc) return json({ error: 'Server misconfigured' }, 500);

  // 1. Look up the recipient's push token. A query error must not read as
  //    "no token" — surface it distinctly so the caller can retry.
  let token: string | null;
  try {
    const res = await fetch(
      supabaseRestUrl(`/profiles?user_id=eq.${userId}&select=expo_push_token`),
      { headers: svc, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return json({ ok: false, error: 'Could not look up recipient' }, 502);
    const rows = await res.json() as { expo_push_token: string | null }[];
    token = rows[0]?.expo_push_token ?? null;
  } catch (e) {
    console.error('[send-push] token lookup failed:', e instanceof Error ? e.message : e);
    return json({ ok: false, error: 'Could not look up recipient' }, 502);
  }

  if (!token) return json({ ok: true, sent: false, reason: 'no_token' });

  // 2. Hand off to Expo's push service.
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default' }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[send-push] Expo push API error:', await res.text());
      return json({ ok: true, sent: false, reason: 'ticket_error' });
    }
    const result = await res.json() as { data?: { status?: string; message?: string } };
    if (result.data?.status === 'error') {
      // e.g. DeviceNotRegistered (uninstalled/expired token) — log so a stale
      // token can eventually be cleared, but this is not a caller-facing failure.
      console.error('[send-push] Expo ticket error:', result.data.message);
      return json({ ok: true, sent: false, reason: 'ticket_error' });
    }
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error('[send-push] Expo push request failed:', e instanceof Error ? e.message : e);
    return json({ ok: true, sent: false, reason: 'ticket_error' });
  }
});
