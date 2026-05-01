import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/theme';

const AUTH_TOKEN_KEY = 'auth_token';

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
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>
          htwa<Text style={styles.logoDot}>.</Text>
        </Text>
      </View>
      <Text style={styles.wordmark}>htwa</Text>
      <Text style={styles.tagline}>Heading That Way Anyway?</Text>
      <ActivityIndicator
        style={styles.spinner}
        color={Colors.primary}
        size="small"
      />
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

  // Logo mark block
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 72 * 0.22,   // 22% of size
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  logoDot: {
    color: Colors.amber,
  },

  // Wordmark beneath logo
  wordmark: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  // Tagline
  tagline: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
  },

  // Loading indicator
  spinner: {
    marginTop: 32,
  },
});
