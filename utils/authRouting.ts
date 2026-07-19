/**
 * utils/authRouting.ts
 *
 * Pure routing decision shared by the signup and returning-user (login) OTP
 * flows in app/verify.tsx, plus app/id-verify.tsx after a submission, and
 * mirrored by SplashScreen. Precedence: no identity submission yet takes
 * priority over a missing profile.
 *
 * verificationStatus semantics (19 Jul, universal identity verification):
 *   null      — never submitted → id-verify is mandatory before anything else.
 *   'pending' | 'approved' | 'rejected' — has submitted at least once →
 *     proceed past id-verify. Browsing/search work regardless of which of
 *     these three; only booking a seat / posting a journey additionally
 *     requires 'approved' (checked at the point of that action, not here).
 */

import type { VerificationStatus } from '../types/database';

export type PostAuthDestination = '/id-verify' | '/profile-setup' | '/(tabs)';

export interface PostAuthState {
  verificationStatus: VerificationStatus | null;
  hasProfile: boolean;
}

export function resolvePostAuthDestination({ verificationStatus, hasProfile }: PostAuthState): PostAuthDestination {
  if (verificationStatus === null) return '/id-verify';
  if (!hasProfile) return '/profile-setup';
  return '/(tabs)';
}
