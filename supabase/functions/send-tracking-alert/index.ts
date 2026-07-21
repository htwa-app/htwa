/**
 * supabase/functions/send-tracking-alert/index.ts
 *
 * Sends a safety alert SMS (SOS / off-course / tracking) to a nominated
 * contact via Twilio. Caller must be authenticated.
 *
 * Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
 * TWILIO_FROM_NUMBER) are optional at deploy time: while absent this
 * function degrades to { ok: false, reason: 'unavailable' } with HTTP 200,
 * so app code can fall back to other channels without treating it as an
 * error. (See BLOCKERS-FOR-JORDAN.md for obtaining the credentials.)
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

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) {
    // Graceful degradation until Twilio credentials land.
    return json({ ok: false, reason: 'unavailable' });
  }

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
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
