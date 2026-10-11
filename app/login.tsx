import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Typography, Spacing, Radius } from '../constants/theme';
import {
  getDestinationAfterSocialSignIn,
  getSocialAvailability,
  signInWithApple,
  signInWithGoogle,
  type SocialAvailability,
  type SocialProvider,
} from '../services/socialAuth';

// "Not available" copy per provider. A provider is never silently re-routed to
// the email signup — the button says plainly why it can't be used.
const UNAVAILABLE_COPY: Record<SocialProvider, string> = {
  apple: "Sign in with Apple isn't available on this device.",
  google: "Google sign-in isn't available yet.",
};
const PROVIDER_DISABLED_COPY: Record<SocialProvider, string> = {
  apple: "Sign in with Apple isn't available yet.",
  google: "Google sign-in isn't available yet.",
};
const ACCOUNT_LOOKUP_ERROR = "You're signed in, but we couldn't load your account. Please try again.";

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  // null while the availability check is in flight (buttons stay usable — the
  // sign-in functions re-check themselves and report 'unavailable').
  const [availability, setAvailability] = useState<Record<SocialProvider, SocialAvailability> | null>(null);
  // Providers Supabase reported as not enabled yet (discovered on first tap).
  const [providerDisabled, setProviderDisabled] = useState<Record<SocialProvider, boolean>>({ apple: false, google: false });
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSocialAvailability().then((a) => { if (!cancelled) setAvailability(a); });
    return () => { cancelled = true; };
  }, []);

  const unavailableCopy = (p: SocialProvider): string | null => {
    if (providerDisabled[p]) return PROVIDER_DISABLED_COPY[p];
    if (availability && !availability[p].available) return UNAVAILABLE_COPY[p];
    return null;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  // Native Apple/Google sign-in → supabase.auth.signInWithIdToken (services/socialAuth).
  const handleSocial = async (provider: SocialProvider) => {
    if (busy || unavailableCopy(provider)) return;
    setSocialError(null);
    setBusy(provider);
    try {
      const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
      switch (result.status) {
        case 'cancelled':
          return; // user backed out — nothing to show
        case 'unavailable':
          if (result.reason === 'provider_disabled') setProviderDisabled((prev) => ({ ...prev, [provider]: true }));
          else setAvailability((prev) => prev && { ...prev, [provider]: { available: false, reason: result.reason } });
          return;
        case 'error':
          setSocialError(result.message);
          return;
        case 'ok': {
          const next = await getDestinationAfterSocialSignIn(result.userId);
          if (!next.ok) { setSocialError(ACCOUNT_LOOKUP_ERROR); return; }
          if (next.destination === '/complete-account') {
            router.replace({ pathname: '/complete-account', params: { name: result.displayName ?? '' } });
          } else {
            router.replace(next.destination);
          }
        }
      }
    } finally {
      setBusy(null);
    }
  };
  const handleApple  = () => void handleSocial('apple');
  const handleGoogle = () => void handleSocial('google');
  const handleEmail  = () => router.push('/signup');
  // Returning users get a dedicated escape hatch below, not a button up here —
  // login-email.tsx is email-only sign-in for an existing account (shouldCreateUser: false).
  const handleLogin  = () => router.push('/login-email');

  const handleOpenTerms         = () => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } });
  const handleOpenSafetyPledge  = () => router.push({ pathname: '/legal/[doc]', params: { doc: 'safety-pledge' } });

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
        <Text style={styles.trustText}>Mandatory ID + selfie verification before app use</Text>
      </View>

      {/* ── Auth buttons ───────────────────────────────────────────────────── */}
      <View style={styles.buttons}>

        {/* Sign up with Apple */}
        <TouchableOpacity
          style={[styles.button, styles.buttonApple, !!unavailableCopy('apple') && styles.buttonUnavailable]}
          onPress={handleApple}
          disabled={!!busy || !!unavailableCopy('apple')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign up with Apple"
          accessibilityState={{ disabled: !!busy || !!unavailableCopy('apple') }}
          testID="apple-button"
        >
          {busy === 'apple'
            ? <ActivityIndicator color={Colors.surface} style={styles.buttonIcon} />
            : <Ionicons name="logo-apple" size={20} color={Colors.surface} style={styles.buttonIcon} />}
          <Text style={[styles.buttonText, styles.buttonTextLight]}>Sign up with Apple</Text>
        </TouchableOpacity>
        {unavailableCopy('apple') && (
          <Text style={styles.unavailableText} testID="apple-unavailable">{unavailableCopy('apple')}</Text>
        )}

        {/* Sign up with Google */}
        <TouchableOpacity
          style={[styles.button, styles.buttonGoogle, !!unavailableCopy('google') && styles.buttonUnavailable]}
          onPress={handleGoogle}
          disabled={!!busy || !!unavailableCopy('google')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign up with Google"
          accessibilityState={{ disabled: !!busy || !!unavailableCopy('google') }}
          testID="google-button"
        >
          {busy === 'google'
            ? <ActivityIndicator color={Colors.textPrimary} style={styles.buttonIcon} />
            : <Ionicons name="logo-google" size={18} color={Colors.textPrimary} style={styles.buttonIcon} />}
          <Text style={[styles.buttonText, styles.buttonTextDark]}>Sign up with Google</Text>
        </TouchableOpacity>
        {unavailableCopy('google') && (
          <Text style={styles.unavailableText} testID="google-unavailable">{unavailableCopy('google')}</Text>
        )}

        {/* Sign up with email */}
        <TouchableOpacity
          style={[styles.button, styles.buttonEmail]}
          onPress={handleEmail}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign up with email"
        >
          <Ionicons name="mail-outline" size={18} color={Colors.primary} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.buttonTextTeal]}>Sign up with email</Text>
        </TouchableOpacity>

        {socialError && <Text style={styles.socialError} testID="social-error">{socialError}</Text>}

      </View>

      {/* ── Returning user ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleLogin}
        accessibilityRole="button"
        accessibilityLabel="Already have an account? Log in"
        style={styles.loginLink}
      >
        <Text style={styles.loginLinkText}>
          Already have an account? <Text style={styles.loginLinkTextBold}>Log in</Text>
        </Text>
      </TouchableOpacity>

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
    ...Typography.bodyLarge,
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
  // Email — teal tint background, teal text
  // Provider can't be used right now (no credentials yet / unsupported device):
  // visibly greyed out, with the reason printed directly underneath.
  buttonUnavailable: {
    opacity: 0.45,
  },
  unavailableText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -Spacing.xs,
  },
  socialError: {
    ...Typography.bodySmall,
    color: Colors.sos,
    textAlign: 'center',
  },
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

  // Returning-user link
  loginLink: {
    marginTop: Spacing.xl,
    alignSelf: 'center',
  },
  loginLinkText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  loginLinkTextBold: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
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
