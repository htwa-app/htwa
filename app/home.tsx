import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  Typography,
  Spacing,
  Radius,
  ShadowCard,
} from '../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'find' | 'offer';

interface Route {
  id: string;
  from: string;
  to: string;
  price: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const POPULAR_ROUTES: Route[] = [
  { id: '1', from: 'Dublin',  to: 'Galway',   price: 'from €8'  },
  { id: '2', from: 'Belfast', to: 'Dublin',   price: 'from €10' },
  { id: '3', from: 'Cork',    to: 'Limerick', price: 'from €6'  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('find');
  const [fromText, setFromText]   = useState('');
  const [toText, setToText]       = useState('');

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFindRidePress  = () => setActiveTab('find');
  const handleOfferRidePress = () => setActiveTab('offer');

  const handleSearchPress = () => {
    // TODO: navigate to search results once the route exists
    console.log('Search rides pressed — from:', fromText, 'to:', toText);
  };

  const handleRoutePress = (route: Route) => {
    // TODO: navigate to route detail once the route exists
    console.log('Route pressed:', route.from, '→', route.to);
  };

  const handleSwap = () => {
    setFromText(toText);
    setToText(fromText);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={Platform.OS === 'android' ? styles.contentAndroid : styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hey Jordan 👋</Text>
          <View style={styles.avatar} accessibilityLabel="Profile">
            <Text style={styles.avatarInitial}>J</Text>
          </View>
        </View>

        {/* ── Toggle tabs ────────────────────────────────────────────────── */}
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

        {/* ── Route input card ───────────────────────────────────────────── */}
        <View style={styles.routeCard}>
          {/* From row */}
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

          <View style={styles.inputDivider} />

          {/* To row */}
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
              <Text style={styles.swapIcon}>⇅</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filter chips ───────────────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          {['Today', 'Any time', '1+ seats'].map((label) => (
            <TouchableOpacity
              key={label}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text style={styles.chipText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Search CTA ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchPress}
          accessibilityRole="button"
          accessibilityLabel="Search rides"
        >
          <Text style={styles.searchButtonText}>Search rides</Text>
        </TouchableOpacity>

        {/* ── Safety section ─────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Built with you in mind</Text>
          <TouchableOpacity accessibilityRole="link" accessibilityLabel="Safety hub">
            <Text style={styles.sectionLink}>Safety hub →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.safetyGrid}>
          <View style={[styles.safetyCard, styles.safetyCardTeal]}>
            <Text style={styles.safetyIcon}>📍</Text>
            <Text style={styles.safetyCardTitle}>Share my journey</Text>
            <Text style={styles.safetyCardBody}>Live tracking for your trusted contacts</Text>
          </View>
          <View style={[styles.safetyCard, styles.safetyCardLavender]}>
            <Text style={styles.safetyIcon}>🌸</Text>
            <Text style={styles.safetyCardTitle}>Women-only mode</Text>
            <Text style={styles.safetyCardBody}>Travel with verified women only</Text>
          </View>
        </View>

        <View style={[styles.safetyGrid, styles.safetyGridBottom]}>
          <View style={[styles.safetyCard, styles.safetyCardGreen]}>
            <Text style={styles.safetyIcon}>✓</Text>
            <Text style={styles.safetyCardTitle}>Verified IDs</Text>
            <Text style={styles.safetyCardBody}>Every account checked against a college email</Text>
          </View>
          <View style={[styles.safetyCard, styles.safetyCardRed]}>
            <Text style={styles.safetyIcon}>🆘</Text>
            <Text style={styles.safetyCardTitle}>In-app SOS</Text>
            <Text style={styles.safetyCardBody}>Silent alert sent to emergency contacts</Text>
          </View>
        </View>

        {/* ── Upcoming for you ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Upcoming for you</Text>

        {POPULAR_ROUTES.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={styles.upcomingCard}
            onPress={() => handleRoutePress(route)}
            accessibilityRole="button"
            accessibilityLabel={`${route.from} to ${route.to}, ${route.price}`}
          >
            <View style={styles.upcomingRoute}>
              <View style={styles.upcomingDots}>
                <View style={[styles.dot, styles.dotFrom]} />
                <View style={styles.dotLine} />
                <View style={[styles.dot, styles.dotTo]} />
              </View>
              <View style={styles.upcomingCities}>
                <Text style={styles.cityFrom}>{route.from}</Text>
                <Text style={styles.cityTo}>{route.to}</Text>
              </View>
            </View>
            <Text style={styles.routePrice}>{route.price}</Text>
          </TouchableOpacity>
        ))}

        {/* ── Legal note ─────────────────────────────────────────────────── */}
        <Text style={styles.legalNote}>
          Drivers share costs only — never profit from a journey.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  // iOS: SafeAreaView handles top inset — no extra paddingTop needed
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxxxxl,
    paddingTop: 0,
  },
  // Android: manually clear the status bar (SafeAreaView doesn't on all devices)
  contentAndroid: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxxxxl,
    paddingTop: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  greeting: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.label,
    color: Colors.surface,
  },

  // Toggle tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.full,
    alignItems: 'center',
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

  // Route input card
  routeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...ShadowCard,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: 14,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  routeDotFrom: {
    backgroundColor: Colors.primary,
  },
  routeDotTo: {
    backgroundColor: Colors.amber,
  },
  routeInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
  },
  inputDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.cardPadding + 10 + 12, // align with text start
  },
  swapButton: {
    padding: 4,
    marginLeft: 8,
  },
  swapIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },

  // Filter chips
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipText: {
    ...Typography.label,
    color: Colors.primary,
  },

  // Search button
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: Spacing.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  searchButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },

  // Safety section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionLink: {
    ...Typography.label,
    color: Colors.primary,
  },
  safetyGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  safetyGridBottom: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  safetyCard: {
    flex: 1,
    borderRadius: Radius.large,
    padding: Spacing.cardPadding,
    ...ShadowCard,
  },
  safetyCardTeal: {
    backgroundColor: Colors.primaryLight,
  },
  safetyCardLavender: {
    backgroundColor: Colors.lavenderLight,
  },
  safetyCardGreen: {
    backgroundColor: '#EDFAF1',
  },
  safetyCardRed: {
    backgroundColor: '#FFF0EF',
  },
  safetyIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  safetyCardTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  safetyCardBody: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },

  // Upcoming routes
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.itemGap,
    ...ShadowCard,
  },
  upcomingRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upcomingDots: {
    width: 16,
    alignItems: 'center',
    marginRight: 12,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFrom: {
    backgroundColor: Colors.primary,
  },
  dotTo: {
    backgroundColor: Colors.amber,
  },
  dotLine: {
    width: 1,
    height: 8,
    backgroundColor: Colors.border,
  },
  upcomingCities: {
    gap: 4,
  },
  cityFrom: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
  },
  cityTo: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  routePrice: {
    ...Typography.headingSmall,
    color: Colors.primary,
  },

  // Legal
  legalNote: {
    textAlign: 'center',
    ...Typography.micro,
    color: Colors.textTertiary,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
