/**
 * supabase/functions/send-tracking-alert/index.ts
 *
 * Sends a safety alert SMS (SOS / off-course / tracking) to a nominated
 * contact via Twilio. Caller must be authenticated.
 *
 * Auth uses a Twilio Restricted API Key (SID + secret, scoped to Messages
 * Create+Read only), NOT the account's master Auth Token — principle of
 * least privilege: a leaked/rotated API key can only send/read messages,
 * never touch billing, other API keys, or account settings. Twilio's REST
 * API still requires the real Account SID in the URL path regardless of
 * which credential authenticates the request, so TWILIO_ACCOUNT_SID,
 * TWILIO_API_KEY_SID, and TWILIO_API_KEY_SECRET are three separate values.
 *
 * All four (+ TWILIO_FROM_NUMBER) are optional at deploy time: while any
 * are absent this function degrades to { ok: false, reason: 'unavailable' }
 * with HTTP 200, so app code can fall back to other channels without
 * treating it as an error. (See BLOCKERS-FOR-JORDAN.md for obtaining them.)
 *
 * Request body:
 *   { to: string (E.164), message: string, alertType?: 'sos' | 'off_course' | 'tracking' }
 *
 * Response: { ok: true, sid } | { ok: false, reason: 'unavailable' | 'invalid' }
 */

import { getAuthedUser, json } from '../_shared/auth.ts';

const E164 = /^\+[1-9]\d{6,14}$/;
const MAX_MESSAGE_LENGTH = 640; // 4 concatenated SMS segments — plenty for any alert

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: { to?: string; message?: string; alertType?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { to, message } = body;
  if (!to || !message) return json({ ok: false, reason: 'invalid' }, 400);
  if (!E164.test(to)) return json({ ok: false, reason: 'invalid' }, 400);

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID');
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!accountSid || !apiKeySid || !apiKeySecret || !from) {
    // Graceful degradation until all four Twilio values land.
    return json({ ok: false, reason: 'unavailable' });
  }

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        // Restricted API Key as the Basic Auth credential — see file header.
        'Authorization': `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: message.slice(0, MAX_MESSAGE_LENGTH),
      }),
    },
  );
  if (!twilioRes.ok) {
    console.error('[send-tracking-alert] Twilio error:', await twilioRes.text());
    return json({ ok: false, reason: 'unavailable' }, 502);
  }
  const msg = await twilioRes.json() as { sid: string };
  return json({ ok: true, sid: msg.sid });
});
