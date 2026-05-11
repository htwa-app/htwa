/**
 * app/signin-email.tsx
 *
 * Sign in with email stub.
 * Auto-navigates to /(tabs) on mount — simulates a successful auth for
 * development. Replace with real email/password flow in Stage 16.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInEmail() {
  const router = useRouter();

  useEffect(() => {
    // TODO Stage 20: implement real email/password flow via supabase.auth.signInWithPassword({ email, password })
    router.replace('/(tabs)');
  }, [router]);

  return null;
}
