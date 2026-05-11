import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────
// Stub — ID + selfie verification flow will be implemented in Stage 18.
// TODO Stage 18: trigger Stripe Identity SDK

export default function IdVerifyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your identity</Text>
      <Text style={styles.body}>ID verification coming in Stage 18.</Text>
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
