/**
 * app/signin-mobile.tsx
 *
 * Mobile OTP sign-in stub — deferred to Phase 15.
 * Routes to /signup in the meantime.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInMobile() {
  const router = useRouter();

  useEffect(() => {
    // TODO Phase 15: implement mobile OTP via supabase.auth.signInWithOtp({ phone })
    router.replace('/signup');
  }, [router]);

  return null;
}
