/**
 * app/signin-google.tsx
 *
 * Google Sign-In stub — deferred to Phase 15 (requires Google Cloud OAuth setup).
 * Routes to /signup in the meantime.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInGoogle() {
  const router = useRouter();

  useEffect(() => {
    // TODO Phase 15: implement Google Sign-In via supabase.auth.signInWithOAuth({ provider: 'google' })
    router.replace('/signup');
  }, [router]);

  return null;
}
