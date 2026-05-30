/**
 * components/RouteInput.tsx
 *
 * Stage 27 — Route Input component per DESIGN-SPEC §9.2.
 *
 * Two inputs (From / To) with coloured dot indicators and a swap button.
 * When the user types, an autocomplete dropdown is shown using the
 * Google Places Autocomplete API. Selecting a suggestion fills the input
 * and clears the dropdown.
 *
 * Props:
 *   from / to          — controlled values
 *   onFromChange /
 *   onToChange         — value change handlers
 *   onFromSelect /
 *   onToSelect         — called when a suggestion is selected (address string)
 *   disabled           — disable both inputs
 *
 * Spec-local constants:
 *   FROM_DOT_COLOR  — green dot per §9.2 route input spec
 *   TO_DOT_COLOR    — orange dot per §9.2 route input spec
 *   DOT_SIZE        — 10px dot diameter
 *   CONNECTOR_COLOR — faint vertical line connecting the two dots
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  FontFamily,
} from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** Green dot for the From input per DESIGN-SPEC §9.2 */
const FROM_DOT_COLOR  = '#34C759';
/** Orange dot for the To input — amber family, per §9.2 */
const TO_DOT_COLOR    = '#E8A55A';  // = Colors.amber
/** Dot diameter (not in spacing scale) */
const DOT_SIZE        = 10;
/** Faint connector line between the two dots */
const CONNECTOR_COLOR = 'rgba(40,30,20,0.15)';
/** Input font size — matches §6.3 Input spec */
const INPUT_FONT_SIZE = 16;
/** Autocomplete dropdown z-index */
const DROPDOWN_Z = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaceSuggestion {
  placeId:     string;
  description: string;
}

export interface RouteInputProps {
  from:           string;
  to:             string;
  onFromChange:   (value: string) => void;
  onToChange:     (value: string) => void;
  onFromSelect?:  (address: string, placeId: string) => void;
  onToSelect?:    (address: string, placeId: string) => void;
  disabled?:      boolean;
  testID?:        string;
}

// ─── Google Places autocomplete ───────────────────────────────────────────────

async function fetchSuggestions(input: string, apiKey: string): Promise<PlaceSuggestion[]> {
  if (!input.trim() || input.length < 3) return [];
  try {
    const params = new URLSearchParams({
      input,
      key:        apiKey,
      components: 'country:ie|country:gb',  // ROI + NI only
      language:   'en',
    });
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json() as {
      predictions?: Array<{ place_id: string; description: string }>;
    };
    return (json.predictions ?? []).map((p) => ({
      placeId:     p.place_id,
      description: p.description,
    }));
  } catch {
    return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RouteInput({
  from,
  to,
  onFromChange,
  onToChange,
  onFromSelect,
  onToSelect,
  disabled = false,
  testID,
}: RouteInputProps): React.ReactElement {

  const [fromSuggestions, setFromSuggestions] = useState<PlaceSuggestion[]>([]);
  const [toSuggestions,   setToSuggestions]   = useState<PlaceSuggestion[]>([]);
  const [loadingFrom,     setLoadingFrom]     = useState(false);
  const [loadingTo,       setLoadingTo]       = useState(false);

  const fromDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toDebounce   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API key ───────────────────────────────────────────────────────────────
  const apiKey = process.env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'] ?? '';

  // ── Input handlers ────────────────────────────────────────────────────────

  const handleFromChange = useCallback((text: string) => {
    onFromChange(text);
    if (fromDebounce.current) clearTimeout(fromDebounce.current);
    if (!text.trim()) { setFromSuggestions([]); return; }
    setLoadingFrom(true);
    fromDebounce.current = setTimeout(async () => {
      const suggestions = await fetchSuggestions(text, apiKey);
      setFromSuggestions(suggestions);
      setLoadingFrom(false);
    }, 300);
  }, [onFromChange, apiKey]);

  const handleToChange = useCallback((text: string) => {
    onToChange(text);
    if (toDebounce.current) clearTimeout(toDebounce.current);
    if (!text.trim()) { setToSuggestions([]); return; }
    setLoadingTo(true);
    toDebounce.current = setTimeout(async () => {
      const suggestions = await fetchSuggestions(text, apiKey);
      setToSuggestions(suggestions);
      setLoadingTo(false);
    }, 300);
  }, [onToChange, apiKey]);

  const selectFrom = (item: PlaceSuggestion) => {
    onFromChange(item.description);
    setFromSuggestions([]);
    onFromSelect?.(item.description, item.placeId);
  };

  const selectTo = (item: PlaceSuggestion) => {
    onToChange(item.description);
    setToSuggestions([]);
    onToSelect?.(item.description, item.placeId);
  };

  const handleSwap = () => {
    const prevFrom = from;
    const prevTo   = to;
    onFromChange(prevTo);
    onToChange(prevFrom);
    setFromSuggestions([]);
    setToSuggestions([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View testID={testID ?? 'route-input'} style={styles.wrapper}>
      {/* ── Route lines card ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        {/* From row */}
        <View style={styles.inputRow}>
          <View style={styles.dotColumn}>
            <View style={[styles.dot, styles.dotFrom]} testID="from-dot" />
            <View style={styles.connector} />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="From"
              placeholderTextColor={Colors.textTertiary}
              value={from}
              onChangeText={handleFromChange}
              editable={!disabled}
              returnKeyType="next"
              accessibilityLabel="From location"
              testID="from-input"
            />
            {loadingFrom && (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={styles.inputSpinner}
                testID="from-loading"
              />
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.rowDivider} />

        {/* To row */}
        <View style={styles.inputRow}>
          <View style={styles.dotColumn}>
            <View style={[styles.dot, styles.dotTo]} testID="to-dot" />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="To"
              placeholderTextColor={Colors.textTertiary}
              value={to}
              onChangeText={handleToChange}
              editable={!disabled}
              returnKeyType="search"
              accessibilityLabel="To location"
              testID="to-input"
            />
            {loadingTo && (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={styles.inputSpinner}
                testID="to-loading"
              />
            )}
          </View>
        </View>

        {/* Swap button */}
        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwap}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Swap from and to locations"
          testID="swap-button"
        >
          <Ionicons name="swap-vertical" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── From suggestions dropdown ──────────────────────────────────────── */}
      {fromSuggestions.length > 0 && (
        <View style={styles.dropdown} testID="from-dropdown">
          <FlatList
            data={fromSuggestions}
            keyExtractor={(item) => item.placeId}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => selectFrom(item)}
                accessibilityRole="button"
                testID={`from-suggestion-${item.placeId}`}
              >
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── To suggestions dropdown ────────────────────────────────────────── */}
      {toSuggestions.length > 0 && (
        <View style={styles.dropdown} testID="to-dropdown">
          <FlatList
            data={toSuggestions}
            keyExtractor={(item) => item.placeId}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => selectTo(item)}
                accessibilityRole="button"
                testID={`to-suggestion-${item.placeId}`}
              >
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

export default RouteInput;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.sm,
    position: 'relative',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },

  dotColumn: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width:        DOT_SIZE,
    height:       DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotFrom: {
    backgroundColor: FROM_DOT_COLOR,
  },
  dotTo: {
    backgroundColor: TO_DOT_COLOR,
  },
  connector: {
    width:           2,
    flex:            1,
    backgroundColor: CONNECTOR_COLOR,
    marginVertical:  2,
  },

  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: INPUT_FONT_SIZE,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  inputSpinner: {
    marginLeft: Spacing.xs,
  },

  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 24 + Spacing.sm,
  },

  swapButton: {
    position: 'absolute',
    right: Spacing.cardPadding,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.elevated,
    marginTop: Spacing.xs,
    zIndex: DROPDOWN_Z,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  dropdownText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
});
