import { useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontFamily } from '../../constants/theme';

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND_NAME    = 'htwa';
const BRAND_DOT     = '.';
const BRAND_TAGLINE = 'heading that way anyway.';

export default function SplashScreen() {
  const router = useRouter();
  const { session, isLoading, verificationStatus, verificationLoadError, refreshVerification } = useAuth();

  useEffect(() => {
    // Stay on splash while the auth check is in flight
    if (isLoading) return;

    if (!session) {
      // No authenticated user — go to login
      router.replace('/login');
    } else if (verificationLoadError) {
      // A failed status fetch must NEVER read as "never submitted" — stay
      // here with a retry rather than routing an already-verified user
      // back through /id-verify on a transient network blip.
      return;
    } else if (verificationStatus === null) {
      // Logged in but never submitted identity verification — go to id-verify.
      // Once submitted (pending/approved/rejected all count), browsing is
      // allowed straight away — only booking/posting gates on 'approved'.
      router.replace('/id-verify');
    } else {
      router.replace('/(tabs)');
    }
  }, [isLoading, session, verificationStatus, verificationLoadError, router]);

  return (
    <View style={styles.container}>
      {/* Logo mark — teal rounded square */}
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>
          {BRAND_NAME}<Text style={styles.logoDot} testID="logo-dot">{BRAND_DOT}</Text>
        </Text>
      </View>

      {/* Tagline — all lowercase, ends with a period, no exceptions */}
      <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>

      {session && verificationLoadError ? (
        <>
          <Text style={styles.errorText} testID="splash-load-error">
            Couldn't check your verification status.
          </Text>
          <TouchableOpacity
            onPress={() => void refreshVerification()}
            accessibilityRole="button"
            testID="splash-retry"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator style={styles.spinner} color={Colors.primary} size="small" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo mark block — 72×72 teal rounded square
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 72 * 0.22, // 22% of size per spec
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    color: Colors.surface,
    letterSpacing: -1,
  },
  logoDot: {
    color: Colors.amber,
  },

  // Tagline — secondary text, 14px regular
  tagline: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Spinner
  spinner: {
    marginTop: 32,
  },

  // Load-error retry state
  errorText: {
    marginTop: 32,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
});
