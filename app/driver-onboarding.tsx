/**
 * app/driver-onboarding.tsx
 *
 * Block 4i — Driver onboarding: captures tax residence, engine capacity, the
 * insurance attestations, and a single required declaration before a driver can
 * post journeys. Persists to `driver_pricing_profiles`.
 *
 * ⚠️ ALL legal / declaration / attestation copy in this screen is
 *    // PLACEHOLDER LEGAL TEXT — PENDING ADVISER REVIEW
 *    and is listed in PROGRESS.md for sign-off. Declaration acceptance is stored
 *    with a timestamp and a version string so re-acceptance can be forced if the
 *    wording changes.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { ENGINE_CC_LABELS, type EngineCcBand } from '../utils/pricingEngine';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type TaxResidence = 'ROI' | 'UK';

// Bump this whenever the declaration wording changes to force re-acceptance.
export const DECLARATION_VERSION = 'v1-placeholder-2026-06';

// PLACEHOLDER LEGAL TEXT — PENDING ADVISER REVIEW
function declarationText(taxResidence: TaxResidence | null): string {
  const where = taxResidence === 'UK' ? 'the UK' : taxResidence === 'ROI' ? 'ROI' : '[ROI / the UK]';
  const scheme = taxResidence === 'UK' ? 'HMRC approved' : taxResidence === 'ROI' ? 'Revenue Civil Service' : '[Revenue Civil Service / HMRC approved]';
  return (
    `I confirm I am resident for tax purposes in ${where} and accept reimbursement at the ` +
    `${scheme} mileage rates as full settlement for cost-sharing on journeys I offer. I confirm ` +
    `all information I have given is true. I do not and will not take any additional reimbursement ` +
    `from passengers outside of the app. If I am reimbursed for any journeys off-app, I will ` +
    `maintain an accurate record by updating my mileage total in the app so my annual total stays ` +
    `correct. I understand I am responsible for ensuring I remain compliant with all applicable ` +
    `laws, local guidelines, and tax regulations in my jurisdiction. While HTWA takes every ` +
    `reasonable step to support compliance, HTWA accepts no responsibility for a driver ` +
    `miscalculating or breaching any of the above; it is the driver's duty to ensure they remain ` +
    `compliant.`
  );
}

const ENGINE_OPTIONS: EngineCcBand[] = ['le1200', 'cc1201to1500', 'ge1501'];

export default function DriverOnboardingScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [taxResidence, setTaxResidence] = useState<TaxResidence | null>(null);
  const [engineCc, setEngineCc]         = useState<EngineCcBand | null>(null);
  const [insuranceCert, setInsuranceCert] = useState(false);
  const [notifyInsurer, setNotifyInsurer] = useState(false);
  const [declaration, setDeclaration]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const isValid = taxResidence !== null && engineCc !== null
    && insuranceCert && notifyInsurer && declaration;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('driver_pricing_profiles')
        .upsert({
          user_id:                  user.id,
          tax_residence:            taxResidence,
          engine_cc:                engineCc,
          insurance_cert_confirmed: insuranceCert,
          notify_insurer_confirmed: notifyInsurer,
          declaration_version:      DECLARATION_VERSION,
          declaration_accepted_at:  new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (dbError) { setError('Could not save your details. Please try again.'); return; }
      router.replace('/(tabs)');
    } catch {
      setError('Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
      showsVerticalScrollIndicator={false}
      testID="driver-onboarding-screen"
    >
      <Text style={styles.title}>Driver setup</Text>
      <Text style={styles.subtitle}>
        We use these to calculate fair, cost-share-only pricing for your journeys.
      </Text>

      {/* Tax residence */}
      <Text style={styles.label}>Where are you tax resident?</Text>
      <View style={styles.segmentRow}>
        {(['ROI', 'UK'] as TaxResidence[]).map((opt) => {
          const active = taxResidence === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setTaxResidence(opt)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`tax-${opt}`}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {opt === 'ROI' ? 'Republic of Ireland' : 'United Kingdom'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Sets your units, currency, rate table and tax-year reset date.
      </Text>

      {/* Engine capacity */}
      <Text style={styles.label}>Vehicle engine capacity</Text>
      {ENGINE_OPTIONS.map((opt) => {
        const active = engineCc === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.optionRow, active && styles.optionRowActive]}
            onPress={() => setEngineCc(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`engine-${opt}`}
          >
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={active ? Colors.primary : Colors.textTertiary}
            />
            <Text style={styles.optionText}>{ENGINE_CC_LABELS[opt]}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Attestations */}
      <Text style={styles.label}>Confirmations</Text>
      <CheckRow
        checked={insuranceCert}
        onToggle={() => setInsuranceCert((v) => !v)}
        testID="check-insurance"
        // PLACEHOLDER LEGAL TEXT — PENDING ADVISER REVIEW
        text="I hold a valid certificate of insurance for this vehicle."
      />
      <CheckRow
        checked={notifyInsurer}
        onToggle={() => setNotifyInsurer((v) => !v)}
        testID="check-notify"
        // PLACEHOLDER LEGAL TEXT — PENDING ADVISER REVIEW
        text="I will notify my insurance company that I cost-share journeys, if applicable."
      />

      {/* Declaration */}
      <Text style={styles.label}>Driver declaration</Text>
      <Text style={styles.declaration} testID="declaration-text">
        {declarationText(taxResidence)}
      </Text>
      <Text style={styles.placeholderTag}>
        Placeholder wording — pending legal-adviser review.
      </Text>
      <CheckRow
        checked={declaration}
        onToggle={() => setDeclaration((v) => !v)}
        testID="check-declaration"
        text="I have read and agree to the declaration above."
      />

      {error ? <Text style={styles.error} testID="onboarding-error">{error}</Text> : null}

      <Button
        title={saving ? 'Saving…' : 'Confirm and continue'}
        onPress={handleSubmit}
        disabled={!isValid || saving}
        style={styles.cta}
        testID="onboarding-submit"
      />
    </ScrollView>
  );
}

function CheckRow(props: {
  checked: boolean; onToggle: () => void; text: string; testID: string;
}): React.ReactElement {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={props.onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: props.checked }}
      testID={props.testID}
    >
      <Ionicons
        name={props.checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={props.checked ? Colors.primary : Colors.textTertiary}
      />
      <Text style={styles.checkText}>{props.text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    // paddingTop is set inline (insets.top + Spacing.lg) so the content clears
    // the status bar/Dynamic Island on every device instead of a fixed value.
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.md,
  },
  title: { ...Typography.headingLarge, color: Colors.textPrimary },
  subtitle: { ...Typography.bodyMedium, color: Colors.textSecondary, marginBottom: Spacing.sm },
  label: { ...Typography.headingSmall, color: Colors.textPrimary, marginTop: Spacing.md },
  hint: { ...Typography.bodySmall, color: Colors.textSecondary },
  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primaryLight, alignItems: 'center',
  },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { ...Typography.bodyMedium, color: Colors.primary, textAlign: 'center' },
  segmentTextActive: { color: Colors.surface },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium, borderWidth: 1, borderColor: Colors.border,
  },
  optionRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionText: { ...Typography.bodyMedium, color: Colors.textPrimary },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  declaration: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  placeholderTag: { ...Typography.bodySmall, color: Colors.amber, fontStyle: 'italic' },
  error: { ...Typography.bodySmall, color: Colors.sos },
  cta: { marginTop: Spacing.lg },
});
