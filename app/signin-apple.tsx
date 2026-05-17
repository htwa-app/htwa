/**
 * app/signin-apple.tsx
 *
 * Apple Sign-In stub — deferred to Phase 15 (requires Apple Developer account).
 * Routes to /signup in the meantime.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInApple() {
  const router = useRouter();

  useEffect(() => {
    // TODO Phase 15: implement Apple Sign-In via supabase.auth.signInWithOAuth({ provider: 'apple' })
    router.replace('/signup');
  }, [router]);

  return null;
}
