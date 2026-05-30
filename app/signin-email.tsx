/**
 * app/signin-email.tsx
 *
 * Email entry point — routes new users to /signup (email OTP sign-up flow).
 * Returning user sign-in (signInWithPassword) is deferred to Phase 15.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInEmail() {
  const router = useRouter();

  useEffect(() => {
    // New users: enter the email OTP sign-up flow.
    // TODO Phase 15: add a "returning user" path via supabase.auth.signInWithPassword({ email, password })
    router.replace('/signup');
  }, [router]);

  return null;
}
