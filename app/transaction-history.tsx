/**
 * app/transaction-history.tsx
 *
 * Stage 46 — Transaction History screen.
 * Lists payments made (passenger) and received (driver).
 * Reads from Stripe via a Supabase Edge Function.
 * Stubs the edge function call — shows a placeholder state until the real
 * Stripe Connect account is set up (Stage 39 manual step).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/** Charge type label colours */
const CHARGE_COLORS = {
  payment:  { bg: Colors.primaryLight, text: Colors.primary },
  payout:   { bg: '#E8F8EE',           text: '#1A7A3C'      },
  refund:   { bg: Colors.amberLight,   text: '#8B5A00'      },
};

interface Transaction {
  id:          string;
  type:        'payment' | 'payout' | 'refund';
  amount:      number;
  currency:    'EUR' | 'GBP';
  description: string;
  date:        string;
}

export default function TransactionHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      // Call edge function to get Stripe charges/payouts
      const { data, error: fnErr } = await supabase.functions.invoke('get-transactions', {
        body: { userId: user.id },
      });
      if (fnErr) {
        // Edge function not deployed yet — show empty state
        setTransactions([]);
        return;
      }
      setTransactions((data?.transactions as Transaction[]) ?? []);
    } catch {
      setError('Could not load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchTransactions(); }, [fetchTransactions]);

  if (isLoading) return <View style={styles.center} testID="transactions-loading"><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="transaction-history-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" testID="back-button">
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {error && <Text style={styles.errorText} testID="transactions-error">{error}</Text>}

      {transactions.length === 0 && !error && (
        <View style={styles.emptyState} testID="transactions-empty">
          <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyText}>
            Your payment history will appear here once you book or complete a ride.
          </Text>
        </View>
      )}

      {transactions.map((tx) => {
        const colors = CHARGE_COLORS[tx.type] ?? CHARGE_COLORS.payment;
        return (
          <View key={tx.id} style={styles.txCard} testID={`tx-${tx.id}`}>
            <View style={styles.txLeft}>
              <View style={[styles.txBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.txBadgeText, { color: colors.text }]}>{tx.type}</Text>
              </View>
              <Text style={styles.txDesc}>{tx.description}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.type === 'payout' ? '#1A7A3C' : Colors.textPrimary }]}>
              {tx.type === 'payout' ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.xxxxxl, gap: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  screenTitle: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  errorText: { ...Typography.bodySmall, color: Colors.sos },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxxxl, gap: Spacing.md },
  emptyTitle: { ...Typography.headingMedium, color: Colors.textPrimary },
  emptyText: { ...Typography.bodyMedium, color: Colors.textSecondary, textAlign: 'center' },
  txCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { gap: 2, flex: 1 },
  txBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: Spacing.xs },
  txBadgeText: { fontSize: 11, fontFamily: 'Poppins_500Medium' },
  txDesc: { ...Typography.bodyMedium, color: Colors.textPrimary },
  txDate: { ...Typography.bodySmall, color: Colors.textTertiary },
  txAmount: { ...Typography.headingSmall },
});
