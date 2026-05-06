/**
 * app/home.tsx
 *
 * Home screen per DESIGN-SPEC.md §9.2.
 *
 * Layout (top → bottom):
 *   Header          — greeting + Avatar
 *   Toggle tabs     — Find a ride / Offer a ride
 *   Route input     — Card with From/To inputs + swap button
 *   Filter chips    — Today / Any time / 1+ seats (display-only for now)
 *   Search CTA      — full-width primary Button
 *   Safety section  — "Built with you in mind" 2×2 feature grid
 *   Upcoming        — "Upcoming for you" placeholder (real data in Stage 38)
 *   Legal note
 *
 * All values from constants/theme.ts. No magic numbers.
 * No inline styles — all styles in StyleSheet at the bottom.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  Typography,
  Spacing,
  BorderRadius,
} from '../constants/theme';
import { Avatar }  from '../components/Avatar';
import { Button }  from '../components/Button';
import { Card }    from '../components/Card';
import { Chip }    from '../components/Chip';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'find' | 'offer';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** Input row vertical padding — not in Spacing scale */
const INPUT_ROW_PADDING_VERTICAL = 14;

/** Route dot diameter — §9.2 design detail */
const ROUTE_DOT_SIZE = 10;

/** Route dot right margin — aligns text across both rows */
const ROUTE_DOT_MARGIN_RIGHT = 12;

// ─── Safety feature data ──────────────────────────────────────────────────────

type SafetyFeature = {
  id:          string;
  icon:        React.ComponentProps<typeof Ionicons>['name'];
  title:       string;
  description: string;
  background:  string;
};

const SAFETY_FEATURES: SafetyFeature[] = [
  {
    id:          'journey',
    icon:        'location-outline',
    title:       'Share my journey',
    description: 'Live tracking for your trusted contacts',
    background:  Colors.primaryLight,
  },
  {
    id:          'women',
    icon:        'shield-checkmark-outline',
    title:       'Women-only mode',
    description: 'Travel with verified women only',
    background:  Colors.lavenderLight,
  },
  {
    id:          'verified',
    icon:        'checkmark-circle-outline',
    title:       'Verified IDs',
    description: 'Every account checked against a college email',
    background:  Colors.primaryLight,
  },
  {
    id:          'sos',
    icon:        'alert-circle-outline',
    title:       'In-app SOS',
    description: 'Silent alert sent to emergency contacts',
    background:  Colors.sosLight,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('find');
  const [fromText, setFromText]   = useState('');
  const [toText, setToText]       = useState('');
  // TODO: pass womenOnly state to search query in Stage 33
  const [womenOnly, setWomenOnly] = useState(false);

  // TODO: replace with auth context when Stage 20 is complete
  const user          = { name: 'Jordan' };
  const greeting      = user.name ? `Hey ${user.name} 👋` : 'Hey there 👋';
  const avatarInitial = user.name ? user.name[0] : '?';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFindRidePress  = () => setActiveTab('find');
  const handleOfferRidePress = () => setActiveTab('offer');

  const handleSwap = () => {
    setFromText(toText);
    setToText(fromText);
  };

  const handleSearchPress = () => {
    // TODO: navigate to search results (Stage 33)
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          Platform.OS === 'android' ? styles.contentAndroid : styles.content
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Avatar
            initials={avatarInitial}
            testID="header-avatar"
          />
        </View>

        {/* ── Find / Offer toggle ─────────────────────────────────────────── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'find' && styles.tabActive]}
            onPress={handleFindRidePress}
            accessibilityRole="tab"
            accessibilityLabel="Find a ride"
            accessibilityState={{ selected: activeTab === 'find' }}
          >
            <Text style={[styles.tabText, activeTab === 'find' && styles.tabTextActive]}>
              Find a ride
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'offer' && styles.tabActive]}
            onPress={handleOfferRidePress}
            accessibilityRole="tab"
            accessibilityLabel="Offer a ride"
            accessibilityState={{ selected: activeTab === 'offer' }}
          >
            <Text style={[styles.tabText, activeTab === 'offer' && styles.tabTextActive]}>
              Offer a ride
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Route input card ────────────────────────────────────────────── */}
        {/* Card padding overridden to 0 so the divider spans edge-to-edge.   */}
        {/* Each inputRow handles its own horizontal padding.                 */}
        <Card style={styles.routeCard}>
          {/* From */}
          <View style={styles.inputRow}>
            <View style={[styles.routeDot, styles.routeDotFrom]} />
            <TextInput
              style={styles.routeInput}
              placeholder="From — city, town or university"
              placeholderTextColor={Colors.textTertiary}
              value={fromText}
              onChangeText={setFromText}
              returnKeyType="next"
              accessibilityLabel="From location"
            />
          </View>

          {/* Divider — left-aligned with the text start */}
          <View style={styles.inputDivider} />

          {/* To */}
          <View style={styles.inputRow}>
            <View style={[styles.routeDot, styles.routeDotTo]} />
            <TextInput
              style={styles.routeInput}
              placeholder="City, town or university…"
              placeholderTextColor={Colors.textTertiary}
              value={toText}
              onChangeText={setToText}
              returnKeyType="search"
              accessibilityLabel="To location"
            />
            <TouchableOpacity
              onPress={handleSwap}
              style={styles.swapButton}
              accessibilityRole="button"
              accessibilityLabel="Swap origin and destination"
            >
              <Ionicons
                name="swap-vertical-outline"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Filter chips ────────────────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          <Chip label="Today"    />
          <Chip label="Any time" />
          <Chip label="1+ seats" />
        </View>

        {/* ── Search CTA ──────────────────────────────────────────────────── */}
        <Button
          title="Search rides"
          onPress={handleSearchPress}
          style={styles.searchButton}
        />

        {/* ── Safety section ──────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Built with you in mind</Text>
          {/* Non-interactive for now — navigation target exists in Stage 47 */}
          <Text style={styles.sectionLink}>Safety hub →</Text>
        </View>

        {/* 2×2 grid — two rows of two cards each */}
        <View style={styles.safetyGrid}>
          <View style={styles.safetyRow}>
            {SAFETY_FEATURES.slice(0, 2).map((feature) =>
              feature.id === 'women' ? (
                // Women-only card — has an interactive Switch on the right of the title row
                <View
                  key="women"
                  style={[
                    styles.safetyCard,
                    { backgroundColor: womenOnly ? Colors.lavender : Colors.lavenderLight },
                  ]}
                  testID="safety-card-women"
                >
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={Colors.textPrimary}
                    style={styles.safetyIcon}
                  />
                  <View style={styles.safetyWomenTitleRow}>
                    <Text style={[styles.safetyCardTitle, styles.safetyWomenTitleText]}>
                      {feature.title}
                    </Text>
                    <Switch
                      value={womenOnly}
                      onValueChange={setWomenOnly}
                      thumbColor={womenOnly ? Colors.primary : Colors.surface}
                      trackColor={{ false: Colors.lavenderLight, true: Colors.lavender }}
                      accessibilityLabel="Women-only mode toggle"
                      testID="women-only-switch"
                    />
                  </View>
                  <Text style={styles.safetyCardBody}>{feature.description}</Text>
                </View>
              ) : (
                // Standard safety card
                <View
                  key={feature.id}
                  style={[styles.safetyCard, { backgroundColor: feature.background }]}
                  testID={`safety-card-${feature.id}`}
                >
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={Colors.textPrimary}
                    style={styles.safetyIcon}
                  />
                  <Text style={styles.safetyCardTitle}>{feature.title}</Text>
                  <Text style={styles.safetyCardBody}>{feature.description}</Text>
                </View>
              )
            )}
          </View>

          <View style={[styles.safetyRow, styles.safetyRowBottom]}>
            {SAFETY_FEATURES.slice(2, 4).map((feature) => (
              <View
                key={feature.id}
                style={[styles.safetyCard, { backgroundColor: feature.background }]}
                testID={`safety-card-${feature.id}`}
              >
                <Ionicons
                  name={feature.icon}
                  size={24}
                  color={Colors.textPrimary}
                  style={styles.safetyIcon}
                />
                <Text style={styles.safetyCardTitle}>{feature.title}</Text>
                <Text style={styles.safetyCardBody}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Upcoming for you ────────────────────────────────────────────── */}
        {/* Placeholder until ride data is available (Stage 38).             */}
        <Text style={[styles.sectionTitle, styles.upcomingHeading]}>
          Upcoming for you
        </Text>
        <Text style={styles.upcomingPlaceholder}>
          Your upcoming rides will appear here.
        </Text>

        {/* ── Legal note ──────────────────────────────────────────────────── */}
        <Text style={styles.legalNote}>
          Drivers share costs only — never profit from a journey.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Scaffold ────────────────────────────────────────────────────────────────
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom:     Spacing.xxxxxl,
    paddingTop:        0,
  },
  contentAndroid: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom:     Spacing.xxxxxl,
    paddingTop:        Spacing.xxxxl,   // 40 px — clears Android status bar
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     Spacing.lg,
    marginBottom:   Spacing.xxl,
  },
  greeting: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
  },

  // ── Toggle tabs ─────────────────────────────────────────────────────────────
  tabContainer: {
    flexDirection:   'row',
    backgroundColor: Colors.primaryLight,
    borderRadius:    BorderRadius.full,
    padding:         Spacing.xs,         // 4 px inner padding
    marginBottom:    Spacing.lg,
  },
  tab: {
    flex:          1,
    paddingVertical: Spacing.sm + 2,     // 10 px
    borderRadius:  BorderRadius.full,
    alignItems:    'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.buttonSmall,
    color: Colors.primary,
  },
  tabTextActive: {
    color: Colors.surface,
  },

  // ── Route input card ────────────────────────────────────────────────────────
  routeCard: {
    padding:      0,               // override Card default; rows handle own padding
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: INPUT_ROW_PADDING_VERTICAL,
  },
  routeDot: {
    width:        ROUTE_DOT_SIZE,
    height:       ROUTE_DOT_SIZE,
    borderRadius: ROUTE_DOT_SIZE / 2,
    marginRight:  ROUTE_DOT_MARGIN_RIGHT,
  },
  routeDotFrom: {
    backgroundColor: Colors.primary,  // teal — origin
  },
  routeDotTo: {
    backgroundColor: Colors.amber,    // orange — destination
  },
  routeInput: {
    flex:       1,
    fontSize:   Typography.bodyLarge.fontSize,   // 16 px
    fontFamily: FontFamily.regular,              // Poppins 400
    color:      Colors.textPrimary,
    padding:    0,                               // removes default Android padding
  },
  inputDivider: {
    height:          1,
    backgroundColor: Colors.border,
    // indent to align with the text start: left edge + horizontal padding + dot + dot margin
    marginLeft: Spacing.cardPadding + ROUTE_DOT_SIZE + ROUTE_DOT_MARGIN_RIGHT,
  },
  swapButton: {
    padding:    Spacing.xs,
    marginLeft: Spacing.sm,
  },

  // ── Filter chips ────────────────────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    marginBottom:  Spacing.lg,
  },

  // ── Search CTA ──────────────────────────────────────────────────────────────
  searchButton: {
    marginBottom: Spacing.xxl,
  },

  // ── Safety section ──────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.md,
  },
  sectionTitle: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
  },
  sectionLink: {
    ...Typography.label,
    color: Colors.primary,
  },
  safetyGrid: {
    marginBottom: Spacing.xxl,
  },
  safetyRow: {
    flexDirection: 'row',
    gap:           Spacing.md,
  },
  safetyRowBottom: {
    marginTop: Spacing.md,
  },
  safetyCard: {
    flex:         1,
    borderRadius: BorderRadius.large,
    padding:      Spacing.cardPadding,
  },
  safetyIcon: {
    marginBottom: Spacing.sm,
  },
  safetyCardTitle: {
    ...Typography.headingSmall,
    color:        Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  safetyCardBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Women-only card title row — icon stays above, title + Switch sit side by side
  safetyWomenTitleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.xs,
  },
  safetyWomenTitleText: {
    flex:         1,
    marginBottom: 0,          // row wrapper owns the bottom spacing instead
    marginRight:  Spacing.xs,
  },

  // ── Upcoming for you ────────────────────────────────────────────────────────
  upcomingHeading: {
    marginBottom: Spacing.md,
  },
  upcomingPlaceholder: {
    ...Typography.bodyMedium,
    color:        Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },

  // ── Legal note ──────────────────────────────────────────────────────────────
  legalNote: {
    textAlign:    'center',
    ...Typography.micro,
    color:        Colors.textTertiary,
    marginTop:    Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
