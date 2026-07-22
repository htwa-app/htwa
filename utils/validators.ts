/**
 * utils/validators.ts
 *
 * Shared form validation utilities.
 * Uses validator.js for robust email checking rather than naive string tests.
 */

import validator from 'validator';
import type { HomeLocation } from '../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignupFormValues {
  fullName:     string;
  email:        string;
  phone:        string;
  university:   string;
  homeLocation: HomeLocation | null;
}

// ─── validateSignupForm ───────────────────────────────────────────────────────

/**
 * Returns true when all signup form fields are valid:
 * - fullName and university must be non-empty after trim
 * - email must pass validator.js isEmail (proper format + domain validation)
 * - phone must contain at least 9 digits (non-digit characters stripped first)
 * - homeLocation must be non-null
 */
export function validateSignupForm({
  fullName,
  email,
  phone,
  university,
  homeLocation,
}: SignupFormValues): boolean {
  const phoneDigits = phone.replace(/\D/g, '');
  return (
    fullName.trim().length > 0 &&
    validator.isEmail(email.trim()) &&
    phoneDigits.length >= 9 &&
    university.trim().length > 0 &&
    homeLocation !== null
  );
}

// ─── validateEmail ────────────────────────────────────────────────────────────

/** Returns true when `email` passes validator.js isEmail (proper format + domain). */
export function validateEmail(email: string): boolean {
  return validator.isEmail(email.trim());
}
