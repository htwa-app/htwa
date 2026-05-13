/**
 * app/signin-email.tsx
 *
 * Sign in with email stub.
 * Routes to /signup — new users enter the sign-up flow.
 * Replace with real email/password flow in Stage 20.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInEmail() {
  const router = useRouter();

  useEffect(() => {
    // TODO Stage 20: implement real email/password flow via supabase.auth.signInWithPassword({ email, password })
    router.replace('/signup');
  }, [router]);

  return null;
}
