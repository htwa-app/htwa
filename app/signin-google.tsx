/**
 * app/signin-google.tsx
 *
 * Sign in with Google stub.
 * Auto-navigates to /(tabs) on mount — simulates a successful auth for
 * development. Replace with real Google Sign-In flow in Stage 16.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignInGoogle() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)');
  }, [router]);

  return null;
}
