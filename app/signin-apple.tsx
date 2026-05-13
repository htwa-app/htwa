/**
 * app/signin-apple.tsx
 *
 * Sign in with Apple stub.
 * Routes to /signup — new users enter the sign-up flow.
 * Replace with real Apple Sign-In flow in Stage 20.
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
