import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Typography, Spacing, Radius } from '../constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  // ── Handlers ─────────────────────────────────────────────────────────────
  // TODO Phase 15: implement Apple Sign-In via supabase.auth.signInWithOAuth({ provider: 'apple' })
  const handleApple  = () => router.push('/signin-apple');
  // TODO Phase 15: implement Google Sign-In via supabase.auth.signInWithOAuth({ provider: 'google' })
  const handleGoogle = () => router.push('/signin-google');
  // TODO Phase 15: implement mobile OTP via supabase.auth.signInWithOtp({ phone })
  const handleMobile = () => router.push('/signin-mobile');
  // Email routes to /signup (new users) — returning user sign-in: TODO Phase 15
  const handleEmail  = () => router.push('/signin-email');

  const handleOpenTerms         = () => console.log('TODO: navigate to terms');
  const handleOpenSafetyPledge  = () => console.log('TODO: navigate to safety pledge');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Logo mark ──────────────────────────────────────────────────────── */}
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>
          htwa<Text style={styles.logoDot} testID="logo-dot">.</Text>
        </Text>
      </View>

      {/* ── Tagline — all lowercase, period not question mark ──────────────── */}
      <Text style={styles.tagline}>heading that way anyway.</Text>

      {/* ── Social proof ───────────────────────────────────────────────────── */}
      <View style={styles.socialProofRow}>
        <View style={styles.avatars}>
          <View style={[styles.avatar, styles.avatarTeal]} />
          <View style={[styles.avatar, styles.avatarLavender]} />
          <View style={[styles.avatar, styles.avatarAmber]} />
        </View>
        <Text style={styles.socialText}>2,400+ verified students</Text>
      </View>

      {/* ── Trust note ─────────────────────────────────────────────────────── */}
      <View style={styles.trustRow}>
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={Colors.textSecondary}
        />
        <Text style={styles.trustText}>Every account verified before use</Text>
      </View>

      {/* ── Auth buttons ───────────────────────────────────────────────────── */}
      <View style={styles.buttons}>

        {/* Continue with Apple */}
        <TouchableOpacity
          style={[styles.button, styles.buttonApple]}
          onPress={handleApple}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Ionicons name="logo-apple" size={20} color={Colors.surface} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.buttonTextLight]}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Continue with Google */}
        <TouchableOpacity
          style={[styles.button, styles.buttonGoogle]}
          onPress={handleGoogle}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Ionicons name="logo-google" size={18} color={Colors.textPrimary} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.buttonTextDark]}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Continue with mobile number */}
        <TouchableOpacity
          style={[styles.button, styles.buttonMobile]}
          onPress={handleMobile}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue with mobile number"
        >
          <Ionicons name="call-outline" size={18} color={Colors.surface} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.buttonTextLight]}>Continue with mobile number</Text>
        </TouchableOpacity>

        {/* Continue with email */}
        <TouchableOpacity
          style={[styles.button, styles.buttonEmail]}
          onPress={handleEmail}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
        >
          <Ionicons name="mail-outline" size={18} color={Colors.primary} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.buttonTextTeal]}>Continue with email</Text>
        </TouchableOpacity>

      </View>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <Text style={styles.footer}>
        {'By continuing you agree to our '}
        <Text style={styles.footerLink} onPress={handleOpenTerms}>Terms</Text>
        {' & '}
        <Text style={styles.footerLink} onPress={handleOpenSafetyPledge}>Community Safety Pledge</Text>
      </Text>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.xxxxxl,
  },

  // Logo mark — 72×72 teal rounded square
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

  // Tagline
  tagline: {
    marginTop: 12,
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  // Social proof row
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatarTeal: {
    backgroundColor: Colors.primary,
    zIndex: 3,
  },
  avatarLavender: {
    backgroundColor: Colors.lavender,
    marginLeft: -8,
    zIndex: 2,
  },
  avatarAmber: {
    backgroundColor: Colors.amber,
    marginLeft: -8,
    zIndex: 1,
  },
  socialText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Trust note
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  trustText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Auth buttons
  buttons: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: 32,
  },
  button: {
    width: '100%',
    height: Spacing.buttonHeight,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    ...Typography.button,
  },

  // Apple — black background, white text
  buttonApple: {
    backgroundColor: Colors.textPrimary,
  },
  // Google — white/surface background, subtle border, dark text
  buttonGoogle: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  // Mobile — primary teal, white text
  buttonMobile: {
    backgroundColor: Colors.primary,
  },
  // Email — teal tint background, teal text
  buttonEmail: {
    backgroundColor: Colors.primaryLight,
  },

  // Text colour variants
  buttonTextLight: {
    color: Colors.surface,
  },
  buttonTextDark: {
    color: Colors.textPrimary,
  },
  buttonTextTeal: {
    color: Colors.primary,
  },

  // Footer
  footer: {
    marginTop: 24,
    ...Typography.micro,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  footerLink: {
    ...Typography.micro,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
});
