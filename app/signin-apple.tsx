/**
 * app/signin-apple.tsx
 *
 * Sign in with Apple stub.
 * Auto-navigates to /(tabs) on mount — simulates a successful auth for
 * development. Replace with real Apple Sign-In flow in Stage 16.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInApple() {
  const router = useRouter();

  useEffect(() => {
    // TODO Stage 20: implement real Apple Sign-In flow via supabase.auth.signInWithOAuth({ provider: 'apple' })
    router.replace('/signup');
  }, [router]);

  return null;
}
