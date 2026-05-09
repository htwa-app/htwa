import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────
// Stub — OTP verification flow will be implemented in Stage 17.

export default function VerifyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your account</Text>
      <Text style={styles.body}>OTP verification coming in Stage 17.</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
