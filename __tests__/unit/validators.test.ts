/**
 * __tests__/unit/validators.test.ts
 *
 * Unit tests for utils/validators.ts.
 */

import { validateSignupForm, validateEmail, validateAccountSetup } from '../../utils/validators';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID: Parameters<typeof validateSignupForm>[0] = {
  fullName:     'Jane Doe',
  email:        'jane@ucd.ie',
  phone:        '+353 087 1234567',
  university:   'UCD',
  homeLocation: 'ROI',
};

// ─── validateSignupForm ───────────────────────────────────────────────────────

describe('validateSignupForm', () => {
  it('returns true for fully valid ROI input', () => {
    expect(validateSignupForm(VALID)).toBe(true);
  });

  it('returns true for fully valid NI input', () => {
    expect(validateSignupForm({ ...VALID, homeLocation: 'NI' })).toBe(true);
  });

  // fullName
  it('returns false when fullName is empty', () => {
    expect(validateSignupForm({ ...VALID, fullName: '' })).toBe(false);
  });

  it('returns false when fullName is only whitespace', () => {
    expect(validateSignupForm({ ...VALID, fullName: '   ' })).toBe(false);
  });

  // email
  it('returns false when email has no @ symbol', () => {
    expect(validateSignupForm({ ...VALID, email: 'janeucd.ie' })).toBe(false);
  });

  it('returns false when email has no domain', () => {
    expect(validateSignupForm({ ...VALID, email: 'jane@' })).toBe(false);
  });

  it('returns false when email has no TLD', () => {
    expect(validateSignupForm({ ...VALID, email: 'jane@universityie' })).toBe(false);
  });

  it('returns false when email is empty', () => {
    expect(validateSignupForm({ ...VALID, email: '' })).toBe(false);
  });

  // phone
  it('returns false when phone has fewer than 9 digits', () => {
    expect(validateSignupForm({ ...VALID, phone: '+353 12 34' })).toBe(false); // 7 digits
  });

  it('returns true when phone has exactly 9 digits', () => {
    expect(validateSignupForm({ ...VALID, phone: '123456789' })).toBe(true);
  });

  it('strips non-digit characters before counting phone digits', () => {
    expect(validateSignupForm({ ...VALID, phone: '+353 (087) 123-4567' })).toBe(true); // 12 digits
  });

  // university
  it('returns false when university is empty', () => {
    expect(validateSignupForm({ ...VALID, university: '' })).toBe(false);
  });

  it('returns false when university is only whitespace', () => {
    expect(validateSignupForm({ ...VALID, university: '   ' })).toBe(false);
  });

  // homeLocation
  it('returns false when homeLocation is null', () => {
    expect(validateSignupForm({ ...VALID, homeLocation: null })).toBe(false);
  });
});

describe('validateEmail', () => {
  it('returns true for a valid email', () => {
    expect(validateEmail('jane@ucd.ie')).toBe(true);
  });

  it('trims whitespace before validating', () => {
    expect(validateEmail('  jane@ucd.ie  ')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('returns false for a malformed email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });

  it('returns false when missing a domain', () => {
    expect(validateEmail('jane@')).toBe(false);
  });
});


describe('validateAccountSetup (social sign-in "complete your account")', () => {
  const ok = { fullName: 'Aoife Kelly', phone: '+353 87 123 4567', homeLocation: 'ROI' as const, gender: 'female' as const };
  it('accepts a complete form', () => expect(validateAccountSetup(ok)).toBe(true));
  it('rejects a blank/whitespace name', () => expect(validateAccountSetup({ ...ok, fullName: '   ' })).toBe(false));
  it('needs at least 9 phone digits (same rule as email signup)', () => {
    expect(validateAccountSetup({ ...ok, phone: '12345678' })).toBe(false);
    expect(validateAccountSetup({ ...ok, phone: '+353 (87) 123-456' })).toBe(true);
  });
  it('needs a home location', () => expect(validateAccountSetup({ ...ok, homeLocation: null })).toBe(false));
  it('needs a gender (drives women-only journeys)', () => expect(validateAccountSetup({ ...ok, gender: null })).toBe(false));
});
