import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// ─── Component ────────────────────────────────────────────────────────────────
// Stub — ID + selfie verification flow will be implemented in Stage 18.
// Auto-navigates to /(tabs) for development. Replace with real KYC flow in Stage 18.
// TODO Stage 18: trigger Stripe Identity SDK instead of auto-redirecting

export default function IdVerifyScreen() {
  const router = useRouter();

  useEffect(() => {
    // TODO Stage 20: replace with real verification status check from Supabase
    if (__DEV__) {
      router.replace('/(tabs)');
    }
  }, [router]);

  return null;
}
