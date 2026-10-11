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
 * First contact (GDPR/UK GDPR Article 14): the contact is a third party who never
 * gave us their number, so the FIRST SMS ever sent to a given number also carries
 * a short notice (see _shared/contactNotice.ts) linking to the full notice. Whether
 * a number has been told is tracked in public.contact_notices (service role only,
 * keyed by a SHA-256 of the number). If that lookup fails we err on the side of
 * telling them again, never of silently skipping the notice. The alert itself is
 * always sent first and never truncated to make room.
 *
 * Request body:
 *   { to: string (E.164), message: string, alertType?: 'sos' | 'off_course' | 'tracking' }
 *
 * Response: { ok: true, sid, noticeIncluded } | { ok: false, reason: 'unavailable' | 'invalid' }
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';
import { hashPhone, planSms } from '../_shared/contactNotice.ts';

const E164 = /^\+[1-9]\d{6,14}$/;

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

  // Has this number already been given the Article 14 notice?
  const svc = serviceHeaders();
  let phoneHash: string | null = null;
  let alreadyNotified = false;
  try {
    phoneHash = await hashPhone(to);
    if (!svc) throw new Error('service role not configured');
    const lookup = await fetch(
      supabaseRestUrl(`/contact_notices?phone_hash=eq.${phoneHash}&select=phone_hash`),
      { headers: svc, signal: AbortSignal.timeout(5000) },
    );
    if (!lookup.ok) throw new Error(`lookup ${lookup.status}`);
    alreadyNotified = ((await lookup.json()) as unknown[]).length > 0;
  } catch (e) {
    // Can't tell → include the notice (an extra notice is harmless; a missed one isn't).
    console.error('[send-tracking-alert] notice lookup failed, including notice:', e instanceof Error ? e.message : e);
    phoneHash = null; // and don't try to record it
  }

  const plan = planSms(message, !alreadyNotified);

  async function sendSms(body: string): Promise<{ ok: true; sid: string } | { ok: false }> {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          // Restricted API Key as the Basic Auth credential — see file header.
          'Authorization': `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to!, From: from!, Body: body }),
      },
    );
    if (!res.ok) {
      console.error('[send-tracking-alert] Twilio error:', await res.text());
      return { ok: false };
    }
    return { ok: true, sid: (await res.json() as { sid: string }).sid };
  }

  // The alert goes first; if IT fails the whole call fails (as before).
  const first = await sendSms(plan.messages[0]);
  if (!first.ok) return json({ ok: false, reason: 'unavailable' }, 502);

  let noticeDelivered = plan.noticeIncluded;
  if (plan.messages.length > 1) {
    // Notice didn't fit alongside the alert → separate follow-up. Its failure
    // doesn't fail the (already delivered) alert, but it must not be recorded as sent.
    noticeDelivered = (await sendSms(plan.messages[1])).ok;
  }

  if (noticeDelivered && plan.noticeIncluded && phoneHash && svc) {
    try {
      const rec = await fetch(supabaseRestUrl('/contact_notices'), {
        method: 'POST',
        headers: { ...svc, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ phone_hash: phoneHash }),
        signal: AbortSignal.timeout(5000),
      });
      if (!rec.ok) console.error('[send-tracking-alert] notice record failed:', await rec.text());
    } catch (e) {
      console.error('[send-tracking-alert] notice record threw:', e instanceof Error ? e.message : e);
    }
  }

  return json({ ok: true, sid: first.sid, noticeIncluded: noticeDelivered && plan.noticeIncluded });
});
