/**
 * app/payment-methods.tsx
 *
 * Block 7 — Payment methods. Two sections with status indicators + entry points:
 *   1. Driver payouts (Stripe Connect receiving method)
 *   2. Passenger card (Stripe paying method)
 *
 * The actual Stripe Connect onboarding + SetupIntent live in Edge Functions that
 * are not yet deployed; until then each action degrades to a clear "not available
 * yet" note rather than failing. No keys are hardcoded.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  getPaymentAccount,
  startConnectOnboarding,
  createSetupIntent,
  type PaymentAccount,
} from '../services/payments';
import type { ConnectStatus } from '../types/database';

const CONNECT_LABEL: Record<ConnectStatus, { label: string; color: string }> = {
  none:       { label: 'Not set up',  color: Colors.textSecondary },
  pending:    { label: 'Pending',     color: Colors.amber },
  active:     { label: 'Active',      color: Colors.verified },
  restricted: { label: 'Action needed', color: Colors.sos },
};

export default function PaymentMethodsScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [busy, setBusy]       = useState<'connect' | 'card' | null>(null);
  const [note, setNote]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setAccount(await getPaymentAccount(user.id));
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const handleSetUpPayouts = async () => {
    if (!user) return;
    setNote(null);
    setBusy('connect');
    try {
      const result = await startConnectOnboarding(user.id);
      if (!result.ok) {
        setNote('Payout setup isn’t available yet — we’ll email you when it opens.');
        return;
      }
      await Linking.openURL(result.url);
    } finally {
      setBusy(null);
    }
  };

  const handleAddCard = async () => {
    if (!user) return;
    setNote(null);
    setBusy('card');
    try {
      const intent = await createSetupIntent(user.id);
      if (!intent.ok) {
        setNote('Card setup isn’t available yet — we’ll email you when it opens.');
        return;
      }
      const init = await initPaymentSheet({
        merchantDisplayName: 'htwa',
        setupIntentClientSecret: intent.clientSecret,
      });
      if (init.error) { setNote('Could not start card setup. Please try again.'); return; }
      const { error } = await presentPaymentSheet();
      if (!error) {
        setNote('Card saved.');
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const connect = CONNECT_LABEL[account?.connect_status ?? 'none'];
  const cardLabel = account?.has_payment_method
    ? `${account.payment_method_brand ?? 'Card'} •••• ${account.payment_method_last4 ?? '----'}`
    : 'No card on file';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="payment-methods-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" testID="back-button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment methods</Text>
        <View style={{ width: 24 }} />
      </View>

      {!account ? (
        <ActivityIndicator color={Colors.primary} testID="payment-methods-loading" />
      ) : (
        <>
          {/* Driver payouts */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="cash-outline" size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Driver payouts</Text>
              <Text style={[styles.status, { color: connect.color }]} testID="connect-status">{connect.label}</Text>
            </View>
            <Text style={styles.cardHint}>
              Where we send your share when you drive. Powered by Stripe Connect.
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={handleSetUpPayouts} disabled={busy === 'connect'} accessibilityRole="button" testID="setup-payouts">
              <Text style={styles.actionBtnText}>
                {busy === 'connect' ? 'Opening…' : account.connect_status === 'active' ? 'Manage payouts' : 'Set up payouts'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Passenger card */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="card-outline" size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Payment card</Text>
              <Text style={styles.status} testID="card-status">{cardLabel}</Text>
            </View>
            <Text style={styles.cardHint}>
              Used to pay for seats you book. Stored securely by Stripe.
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={handleAddCard} disabled={busy === 'card'} accessibilityRole="button" testID="add-card">
              <Text style={styles.actionBtnText}>
                {busy === 'card' ? 'Opening…' : account.has_payment_method ? 'Update card' : 'Add card'}
              </Text>
            </TouchableOpacity>
          </View>

          {note ? <Text style={styles.note} testID="payment-note">{note}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  title: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { ...Typography.headingSmall, color: Colors.textPrimary, flex: 1 },
  status: { ...Typography.bodySmall, color: Colors.textSecondary },
  cardHint: { ...Typography.bodySmall, color: Colors.textSecondary },
  actionBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs,
  },
  actionBtnText: { ...Typography.bodyMedium, color: Colors.primary },
  note: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
});
