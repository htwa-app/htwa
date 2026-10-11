/**
 * supabase/functions/_shared/contactNotice.ts
 *
 * Pure helpers for the Article 14 first-contact notice that send-tracking-alert
 * prepends to the FIRST SMS a nominated contact ever receives (so no imports —
 * this file is also unit-tested from Jest, see __tests__/unit/contactNotice.test.ts).
 *
 * The notice is a short, layered summary + link (the full notice is §4A of the
 * privacy policy at htwa-app.com/privacy) and ends with a working opt-out route
 * that matches §4A: email hello@htwa-app.com. It deliberately does NOT promise
 * "reply STOP" — inbound SMS isn't handled anywhere, so that would be a false
 * opt-out. Brand is always lowercase: htwa.
 */

export const CONTACT_NOTICE =
  'htwa notice: someone named you as their safety contact, so we hold your name and number and text you ' +
  'their journey alerts and location. Info: htwa-app.com/privacy. Opt out: hello@htwa-app.com';

/** 4 concatenated SMS segments — plenty for any alert (matches send-tracking-alert). */
export const MAX_SMS_LENGTH = 640;

export interface SmsPlan {
  /** Messages to send, in order. The ALERT is always first and never truncated by the notice. */
  messages: string[];
  /** True when the notice is part of this plan (in the alert message or as a follow-up). */
  noticeIncluded: boolean;
}

/**
 * First contact → notice appended AFTER the alert in the same message when it
 * fits; otherwise sent as a separate follow-up message so a long emergency alert
 * (location, tracking link, 112/999 advice) is never cut off to make room for it.
 */
export function planSms(alertMessage: string, includeNotice: boolean): SmsPlan {
  const alert = alertMessage.slice(0, MAX_SMS_LENGTH);
  if (!includeNotice) return { messages: [alert], noticeIncluded: false };
  const combined = `${alert}\n\n${CONTACT_NOTICE}`;
  if (combined.length <= MAX_SMS_LENGTH) return { messages: [combined], noticeIncluded: true };
  return { messages: [alert, CONTACT_NOTICE], noticeIncluded: true };
}

/** SHA-256 hex of the E.164 number (Web Crypto — available in Deno and modern Node). */
export async function hashPhone(e164: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e164));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
