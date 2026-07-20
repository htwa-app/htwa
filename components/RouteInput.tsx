/**
 * components/RouteInput.tsx
 *
 * From → To route input per DESIGN-SPEC §9.2 — a white card with a teal "from"
 * dot, an amber "to" dot, and a swap button.
 *
 * Google Places autocomplete (Stage 27, unblocked 20 Jul once a Maps key
 * existed — see BLOCKERS-FOR-JORDAN.md item 1 for the current key-validity
 * issue). Debounced suggestions appear under whichever field is focused;
 * selecting one fills the text AND resolves coordinates via
 * services/places.getPlaceCoords, surfaced to the parent via the optional
 * `onFromPlaceSelect`/`onToPlaceSelect` callbacks. Free-text entry (no
 * selection) still works exactly as before — callers that only pass
 * `onFromChange`/`onToChange` see no behaviour change, so this upgrade needed
 * no caller changes, only additions.
 *
 * Gracefully degrades: with no/invalid Maps key, autocompletePlaces resolves
 * `{ ok: false, reason: 'no_key' }` and no dropdown ever appears — the fields
 * behave exactly like the old plain-text stub.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import {
  autocompletePlaces,
  getPlaceCoords,
  newPlacesSessionToken,
  type PlaceSuggestion,
} from '../services/places';

// ─── Spec-local constants (match app/home.tsx §9.2) ───────────────────────────
const ROUTE_DOT_SIZE = 10;
const AUTOCOMPLETE_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export interface PlaceCoords {
  lat: number;
  lng: number;
}

export interface RouteInputProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Fired when the driver/passenger picks a real suggestion (not free-text) for the origin. */
  onFromPlaceSelect?: (coords: PlaceCoords) => void;
  /** Fired when a real suggestion is picked for the destination. */
  onToPlaceSelect?: (coords: PlaceCoords) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  /** Prominent label rendered above the origin field (e.g. "Departing from"). */
  fromLabel?: string;
  /** Prominent label rendered above the destination field (e.g. "Destination"). */
  toLabel?: string;
  testID?: string;
}

type ActiveField = 'from' | 'to' | null;

export function RouteInput({
  from,
  to,
  onFromChange,
  onToChange,
  onFromPlaceSelect,
  onToPlaceSelect,
  fromPlaceholder = 'From',
  toPlaceholder = 'To',
  fromLabel,
  toLabel,
  testID = 'route-input',
}: RouteInputProps): React.ReactElement {
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const sessionTokenRef = useRef(newPlacesSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const runSearch = useCallback((field: ActiveField, query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!field || query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const seq = ++requestSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      const res = await autocompletePlaces(query, sessionTokenRef.current);
      // Ignore stale responses from a since-superseded keystroke/field switch.
      if (seq !== requestSeqRef.current) return;
      setIsSearching(false);
      setSuggestions(res.ok ? res.suggestions : []);
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }, []);

  const handleFromChange = (value: string) => {
    onFromChange(value);
    setActiveField('from');
    runSearch('from', value);
  };

  const handleToChange = (value: string) => {
    onToChange(value);
    setActiveField('to');
    runSearch('to', value);
  };

  const handleSwap = () => {
    onFromChange(to);
    onToChange(from);
    setSuggestions([]);
    setActiveField(null);
  };

  const clearSuggestions = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestSeqRef.current++; // invalidate any in-flight debounce/search
    setSuggestions([]);
    setIsSearching(false);
    setActiveField(null);
  };

  const handleSelect = async (field: 'from' | 'to', suggestion: PlaceSuggestion) => {
    const setValue = field === 'from' ? onFromChange : onToChange;
    const onSelect = field === 'from' ? onFromPlaceSelect : onToPlaceSelect;
    setValue(suggestion.description);
    clearSuggestions();
    if (!onSelect) return;
    const coords = await getPlaceCoords(suggestion.placeId, sessionTokenRef.current);
    sessionTokenRef.current = newPlacesSessionToken(); // new billing session for the next search
    if (coords.ok) onSelect({ lat: coords.lat, lng: coords.lng });
  };

  const renderDropdown = (field: 'from' | 'to') => {
    if (activeField !== field) return null;
    if (!isSearching && suggestions.length === 0) return null;
    return (
      <View style={styles.dropdown} testID={`${testID}-${field}-suggestions`}>
        {isSearching && suggestions.length === 0 && (
          <View style={styles.suggestionLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s.placeId}
            style={styles.suggestionRow}
            onPress={() => void handleSelect(field, s)}
            accessibilityRole="button"
            accessibilityLabel={s.description}
            testID={`${testID}-${field}-suggestion-${s.placeId}`}
          >
            <Ionicons name="location-outline" size={16} color={Colors.textTertiary} />
            <View style={styles.suggestionTextWrap}>
              <Text style={styles.suggestionMain} numberOfLines={1}>{s.mainText}</Text>
              {!!s.secondaryText && (
                <Text style={styles.suggestionSecondary} numberOfLines={1}>{s.secondaryText}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card} testID={testID}>
        <View style={styles.fields}>
          <View style={styles.fieldCol}>
            {fromLabel ? <Text style={styles.fieldLabel}>{fromLabel}</Text> : null}
            <View style={styles.inputLine}>
              <View style={[styles.dot, styles.dotFrom]} />
              <TextInput
                style={styles.input}
                value={from}
                onChangeText={handleFromChange}
                onFocus={() => setActiveField('from')}
                placeholder={fromPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                accessibilityLabel={fromLabel ?? 'Journey start location'}
                testID={`${testID}-from`}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldCol}>
            {toLabel ? <Text style={styles.fieldLabel}>{toLabel}</Text> : null}
            <View style={styles.inputLine}>
              <View style={[styles.dot, styles.dotTo]} />
              <TextInput
                style={styles.input}
                value={to}
                onChangeText={handleToChange}
                onFocus={() => setActiveField('to')}
                placeholder={toPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                accessibilityLabel={toLabel ?? 'Journey destination'}
                testID={`${testID}-to`}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwap}
          accessibilityRole="button"
          accessibilityLabel="Swap start and destination"
          testID={`${testID}-swap`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="swap-vertical" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {renderDropdown('from')}
      {renderDropdown('to')}
    </View>
  );
}

export default RouteInput;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.sm,
  },
  fields: {
    flex: 1,
  },
  fieldCol: {
    paddingVertical: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: ROUTE_DOT_SIZE + Spacing.md,
  },
  inputLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: ROUTE_DOT_SIZE,
    height: ROUTE_DOT_SIZE,
    borderRadius: ROUTE_DOT_SIZE / 2,
    marginRight: Spacing.md,
  },
  dotFrom: { backgroundColor: Colors.primary }, // teal — origin
  dotTo: { backgroundColor: Colors.amber },     // orange — destination
  input: {
    flex: 1,
    fontSize: Typography.bodyLarge.fontSize,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: ROUTE_DOT_SIZE + Spacing.md,
  },
  swapButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },

  // Suggestions dropdown
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  suggestionLoading: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMain: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  suggestionSecondary: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
});
