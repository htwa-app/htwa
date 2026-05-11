/**
 * app/signin-mobile.tsx
 *
 * Sign in with mobile number stub.
 * Auto-navigates to /(tabs) on mount — simulates a successful auth for
 * development. Replace with real mobile OTP flow in Stage 17.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInMobile() {
  const router = useRouter();

  useEffect(() => {
    // TODO Stage 20: implement real mobile OTP flow via supabase.auth.signInWithOtp({ phone })
    router.replace('/signup');
  }, [router]);

  return null;
}
