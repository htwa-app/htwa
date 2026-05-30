import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontFamily } from '../../constants/theme';

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND_NAME    = 'htwa';
const BRAND_DOT     = '.';
const BRAND_TAGLINE = 'heading that way anyway.';

export default function SplashScreen() {
  const router = useRouter();
  const { session, isLoading, isVerified } = useAuth();

  useEffect(() => {
    // Stay on splash while the auth check is in flight
    if (isLoading) return;

    if (!session) {
      // No authenticated user — go to login
      router.replace('/login');
    } else if (!isVerified) {
      // Logged in but ID verification not complete — go to id-verify
      router.replace('/id-verify');
    } else {
      // Fully authenticated and verified — enter the app
      router.replace('/(tabs)');
    }
  }, [isLoading, session, isVerified, router]);

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

      {/* Loading indicator */}
      <ActivityIndicator style={styles.spinner} color={Colors.primary} size="small" />
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
});
