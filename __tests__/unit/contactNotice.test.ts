/**
 * __tests__/unit/contactNotice.test.ts
 *
 * Article 14 first-contact notice for nominated contacts — the pure planning
 * logic used by supabase/functions/send-tracking-alert (the function itself runs
 * on Deno; the shared module has no imports so Jest can exercise it directly).
 */
import { webcrypto } from 'crypto';
import { CONTACT_NOTICE, MAX_SMS_LENGTH, hashPhone, planSms } from '../../supabase/functions/_shared/contactNotice';

const SOS =
  'htwa SOS: your nominated traveller has triggered an emergency alert. Last location: ' +
  'https://maps.google.com/?q=53.34980,-6.26030 Live tracking: https://htwa-app.com/track#abcdef0123456789abcdef ' +
  "If you can't reach them, contact emergency services (112/999).";

describe('CONTACT_NOTICE copy', () => {
  it('names the brand in lowercase only', () => {
    expect(CONTACT_NOTICE).toMatch(/^htwa notice:/);
    expect(CONTACT_NOTICE).not.toMatch(/HTWA|Htwa/);
  });

  it('carries the three things a layered Article 14 notice needs: what we hold, where the full notice is, how to opt out', () => {
    expect(CONTACT_NOTICE).toContain('hold your name and number');
    expect(CONTACT_NOTICE).toContain('htwa-app.com/privacy');
    expect(CONTACT_NOTICE).toContain('hello@htwa-app.com');
    expect(CONTACT_NOTICE.toLowerCase()).toContain('opt out');
  });

  it('does not promise a "reply STOP" opt-out that nothing handles', () => {
    expect(CONTACT_NOTICE.toUpperCase()).not.toContain('STOP');
  });

  it('is short enough to ride along with an alert in one message', () => {
    expect(CONTACT_NOTICE.length).toBeLessThan(260);
  });
});

describe('planSms', () => {
  it('not first contact → just the alert, unchanged', () => {
    expect(planSms(SOS, false)).toEqual({ messages: [SOS], noticeIncluded: false });
  });

  it('first contact → the notice is appended AFTER the alert in the same message', () => {
    const plan = planSms(SOS, true);
    expect(plan.noticeIncluded).toBe(true);
    expect(plan.messages).toHaveLength(1);
    expect(plan.messages[0].startsWith(SOS)).toBe(true);
    expect(plan.messages[0].endsWith(CONTACT_NOTICE)).toBe(true);
    expect(plan.messages[0].length).toBeLessThanOrEqual(MAX_SMS_LENGTH);
  });

  it('a long alert is NEVER truncated to make room: the notice becomes a separate follow-up', () => {
    const long = 'x'.repeat(MAX_SMS_LENGTH - 50);
    const plan = planSms(long, true);
    expect(plan.messages).toEqual([long, CONTACT_NOTICE]);
    expect(plan.noticeIncluded).toBe(true);
  });

  it('an over-long alert is clipped to the SMS limit exactly as before, notice still follows separately', () => {
    const plan = planSms('y'.repeat(MAX_SMS_LENGTH + 100), true);
    expect(plan.messages[0]).toHaveLength(MAX_SMS_LENGTH);
    expect(plan.messages[1]).toBe(CONTACT_NOTICE);
  });

  it('the alert is always message[0]', () => {
    expect(planSms(SOS, true).messages[0].startsWith('htwa SOS')).toBe(true);
    expect(planSms('z'.repeat(600), true).messages[0].startsWith('zzz')).toBe(true);
  });
});

describe('hashPhone', () => {
  const g = globalThis as unknown as { crypto?: unknown };
  const original = g.crypto;
  beforeAll(() => { g.crypto = webcrypto; });
  afterAll(() => { g.crypto = original; });

  it('is a stable 64-char SHA-256 hex digest — and never contains the number itself', async () => {
    const h = await hashPhone('+353871234567');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hashPhone('+353871234567'));
    expect(h).not.toContain('353871234567');
  });

  it('different numbers hash differently', async () => {
    expect(await hashPhone('+353871234567')).not.toBe(await hashPhone('+353871234568'));
  });

  it('matches the known SHA-256 of the input', async () => {
    // sha256("+353871234567")
    const expected = require('crypto').createHash('sha256').update('+353871234567').digest('hex');
    expect(await hashPhone('+353871234567')).toBe(expected);
  });
});
