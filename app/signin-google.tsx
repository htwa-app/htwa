/**
 * app/signin-google.tsx
 *
 * Sign in with Google stub.
 * Routes to /signup — new users enter the sign-up flow.
 * Replace with real Google Sign-In flow in Stage 20.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInGoogle() {
  const router = useRouter();

  useEffect(() => {
    // TODO Stage 20: implement real Google Sign-In flow via supabase.auth.signInWithOAuth({ provider: 'google' })
    router.replace('/signup');
  }, [router]);

  return null;
}
