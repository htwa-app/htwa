/**
 * components/DriverVerifyPanel.tsx
 *
 * "Verify your driver" disclosure panel (2A-b). Shows the booked passenger:
 * driver's verified photo (live-captured selfie, never the ID document),
 * full name, gender, and vehicle make/model/colour/registration.
 *
 * Data comes from the get_driver_disclosure RPC, which enforces server-side
 * that the caller holds a pending/confirmed booking on this journey — this
 * panel renders its own "unavailable" state for anyone else, and the selfie
 * image is additionally RLS-gated in storage.
 *
 * Shown on: booking confirmation, ride detail (once booked), live-trip.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { supabase } from '../lib/supabase';

interface Disclosure {
  driverName: string;
  gender: string | null;
  selfieUrl: string | null;   // signed URL, short-lived
  vehicle: {
    make?: string;
    model?: string;
    colour?: string;
    registration?: string;
  };
}

interface Props {
  rideId: string;
  testID?: string;
}

const GENDER_LABELS: Record<string, string> = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Not disclosed',
};

export function DriverVerifyPanel({ rideId, testID }: Props): React.ReactElement | null {
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data, error } = await supabase.rpc('get_driver_disclosure', { p_ride_id: rideId });
      if (error) throw error;
      const res = data as {
        ok: boolean;
        reason?: string;
        driver?: { full_name: string; gender: string | null; selfie_url: string | null };
        vehicle?: Record<string, string>;
      };
      if (!res?.ok) {
        setState(res?.reason === 'forbidden' ? 'forbidden' : 'error');
        return;
      }

      // The selfie is stored as a bucket path; convert to a short-lived signed
      // URL (RLS grants read to booked passengers).
      let selfieUrl: string | null = null;
      if (res.driver?.selfie_url) {
        const { data: signed, error: signErr } = await supabase.storage
          .from('verification-selfies')
          .createSignedUrl(res.driver.selfie_url, 300);
        if (signErr) {
          // Photo failing must not hide the rest of the disclosure.
          console.error('[DriverVerify] selfie sign failed:', signErr.message);
        } else {
          selfieUrl = signed?.signedUrl ?? null;
        }
      }

      setDisclosure({
        driverName: res.driver?.full_name ?? 'Driver',
        gender: res.driver?.gender ?? null,
        selfieUrl,
        vehicle: res.vehicle ?? {},
      });
      setState('ready');
    } catch (e) {
      console.error('[DriverVerify] load failed:', e instanceof Error ? e.message : e);
      setState('error');
    }
  }, [rideId]);

  useEffect(() => { void load(); }, [load]);

  // Not booked on this journey — the panel simply doesn't exist for them.
  if (state === 'forbidden') return null;

  if (state === 'loading') {
    return (
      <View style={styles.card} testID={testID ?? 'driver-verify-panel'}>
        <Text style={styles.subtle}>Loading driver details…</Text>
      </View>
    );
  }

  if (state === 'error' || !disclosure) {
    return (
      <View style={styles.card} testID={testID ?? 'driver-verify-panel'}>
        <Text style={styles.errorText}>Couldn't load driver verification details.</Text>
        <TouchableOpacity onPress={load} accessibilityRole="button" testID="driver-verify-retry">
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const v = disclosure.vehicle;
  const vehicleLine = [v.colour, v.make, v.model].filter(Boolean).join(' ');

  return (
    <View style={styles.card} testID={testID ?? 'driver-verify-panel'}>
      <View style={styles.headerRow}>
        <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
        <Text style={styles.title}>Verify your driver</Text>
      </View>
      <Text style={styles.subtle}>
        Before getting in, check the driver and car match these verified details.
      </Text>

      <View style={styles.identityRow}>
        {disclosure.selfieUrl ? (
          <Image
            source={{ uri: disclosure.selfieUrl }}
            style={styles.photo}
            testID="driver-photo"
            accessibilityLabel={`Verified photo of ${disclosure.driverName}`}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]} testID="driver-photo-missing">
            <Ionicons name="person-outline" size={28} color={Colors.textTertiary} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.name} testID="driver-verify-name">{disclosure.driverName}</Text>
          {disclosure.gender && (
            <Text style={styles.subtle} testID="driver-verify-gender">
              {GENDER_LABELS[disclosure.gender] ?? disclosure.gender}
            </Text>
          )}
        </View>
      </View>

      {(vehicleLine || v.registration) ? (
        <View style={styles.vehicleBox} testID="driver-verify-vehicle">
          {vehicleLine ? <Text style={styles.vehicleText}>{vehicleLine}</Text> : null}
          {v.registration ? (
            <View style={styles.regPlate} testID="driver-verify-reg">
              <Text style={styles.regText}>{v.registration.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.subtle} testID="driver-verify-no-vehicle">Vehicle details not provided yet.</Text>
      )}

      <Text style={styles.mismatchNote}>
        Doesn't match? Don't travel — cancel with reason "details didn't match" for a full refund.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  title: { ...Typography.headingSmall, color: Colors.textPrimary },
  name: { ...Typography.headingSmall, color: Colors.textPrimary },
  subtle: { ...Typography.bodySmall, color: Colors.textSecondary },
  link: { ...Typography.bodySmall, color: Colors.primary },
  errorText: { ...Typography.bodySmall, color: Colors.sos },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoFallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  vehicleText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  regPlate: {
    borderWidth: 1, borderColor: Colors.textPrimary, borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  regText: { ...Typography.bodyMedium, color: Colors.textPrimary, letterSpacing: 1 },
  mismatchNote: { ...Typography.bodySmall, color: Colors.textTertiary },
});
