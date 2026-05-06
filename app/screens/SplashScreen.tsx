import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontFamily } from '../../constants/theme';

const AUTH_TOKEN_KEY = 'auth_token';

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND_NAME    = 'htwa';
const BRAND_DOT     = '.';
const BRAND_TAGLINE = 'heading that way anyway.';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth(): Promise<void> {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token !== null) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      } catch {
        // If storage read fails, send to login — safe default
        router.replace('/login');
      }
    }

    void checkAuth();
  }, [router]);

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
