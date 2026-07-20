/**
 * utils/authRouting.ts
 *
 * Pure routing decision shared by the signup and returning-user (login) OTP
 * flows in app/verify.tsx, once a valid public.users row is confirmed to
 * exist. Mirrors the precedence SplashScreen already uses (unverified takes
 * priority over a missing profile) so a user reaches the same place
 * regardless of which flow brought them here.
 */

export type PostAuthDestination = '/id-verify' | '/profile-setup' | '/(tabs)';

export interface PostAuthState {
  isVerified: boolean;
  hasProfile: boolean;
}

export function resolvePostAuthDestination({ isVerified, hasProfile }: PostAuthState): PostAuthDestination {
  if (!isVerified) return '/id-verify';
  if (!hasProfile) return '/profile-setup';
  return '/(tabs)';
}
