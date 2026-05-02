import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, Typography, Spacing, Radius } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  const handleSignIn = () => {
    // TODO: navigate to sign-in flow once the route exists
    router.push('/signin' as never);
  };

  const handleRetry = () => {
    // Route back to splash screen to re-run the auth check
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Logo mark — matches SplashScreen */}
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>
          htwa<Text style={styles.logoDot}>.</Text>
        </Text>
      </View>

      {/* Wordmark */}
      <Text style={styles.wordmark}>htwa</Text>

      {/* Tagline */}
      <Text style={styles.tagline}>heading that way anyway?</Text>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.signInButton}
        onPress={handleSignIn}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        <Text style={styles.signInText}>Sign in</Text>
      </TouchableOpacity>

      {/* Retry option — for users routed here after a storage error */}
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },

  // Logo mark — teal rounded square, identical to SplashScreen
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 72 * 0.22,
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

  // Wordmark
  wordmark: {
    marginTop: 16,
    fontSize: 32,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  // Tagline — all lowercase, no exceptions
  tagline: {
    marginTop: 6,
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  // Primary sign-in button — teal pill per DESIGN-SPEC.md §6.1
  signInButton: {
    marginTop: 40,
    width: '100%',
    height: Spacing.buttonHeight,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    ...Typography.button,
    color: Colors.surface,
  },

  // Retry — secondary text link for users arriving via a storage error
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  retryText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
});
