/**
 * components/NominatedContactCard.tsx
 *
 * Per-journey nominated contact panel (2A-c). Shows the journey's contact and
 * lets the participant change it before departure. Defaults come from
 * getDefaultContact (last-used journey contact → profile nominated_contact).
 *
 * Used on: live-trip (own journey), booking flow, offer-journey confirm.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import {
  getDefaultContact,
  getJourneyContact,
  setJourneyContact,
} from '../services/tracking';
import type { JourneyContactRow } from '../types/database';

interface Props {
  rideId: string;
  userId: string;
  /** Contact can only be changed before departure. */
  editable: boolean;
  /** Called whenever the journey contact is loaded or saved. */
  onContact?: (contact: JourneyContactRow | null) => void;
  testID?: string;
}

export function NominatedContactCard({ rideId, userId, editable, onContact, testID }: Props): React.ReactElement {
  const [contact, setContact] = useState<JourneyContactRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await getJourneyContact(rideId, userId);
      if (res.ok) {
        setContact(res.contact);
        onContact?.(res.contact);
      } else if (res.reason === 'none') {
        setContact(null);
        onContact?.(null);
        // Pre-fill the editor with the user's default contact.
        const def = await getDefaultContact(userId);
        if (def) { setName(def.name); setPhone(def.phone); }
      } else {
        setLoadError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [rideId, userId, onContact]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await setJourneyContact(rideId, userId, { name, phone });
      if (!res.ok) { setSaveError(res.message); return; }
      setContact(res.contact);
      onContact?.(res.contact);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card} testID={testID ?? 'contact-card'}>
        <Text style={styles.subtle}>Loading nominated contact…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.card} testID={testID ?? 'contact-card'}>
        <Text style={styles.errorText}>Couldn't load your nominated contact.</Text>
        <TouchableOpacity onPress={load} accessibilityRole="button" testID="contact-retry">
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isEditing || !contact) {
    return (
      <View style={styles.card} testID={testID ?? 'contact-card'}>
        <Text style={styles.title}>Nominated contact for this journey</Text>
        <Text style={styles.subtle}>
          They'll receive live tracking and safety alerts for this journey only.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Contact name"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          editable={!isSaving}
          testID="contact-name-input"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (e.g. +353 87 123 4567)"
          placeholderTextColor={Colors.textTertiary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!isSaving}
          testID="contact-phone-input"
        />
        {saveError && <Text style={styles.errorText} testID="contact-save-error">{saveError}</Text>}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          testID="contact-save-button"
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save contact'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card} testID={testID ?? 'contact-card'}>
      <View style={styles.row}>
        <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.title} testID="contact-name">{contact.contact_name}</Text>
          <Text style={styles.subtle} testID="contact-phone">{contact.contact_phone}</Text>
        </View>
        {editable && (
          <TouchableOpacity
            onPress={() => {
              setName(contact.contact_name);
              setPhone(contact.contact_phone);
              setIsEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change nominated contact"
            testID="contact-edit-button"
          >
            <Text style={styles.link}>Change</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.lavenderLight, borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  title: { ...Typography.headingSmall, color: Colors.textPrimary },
  subtle: { ...Typography.bodySmall, color: Colors.textSecondary },
  link: { ...Typography.bodySmall, color: Colors.primary },
  errorText: { ...Typography.bodySmall, color: Colors.sos },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.medium,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Typography.bodyMedium, color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { ...Typography.bodyMedium, color: Colors.surface },
});
