import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

export default function HomeScreen() {
  const [destination, setDestination] = useState('');
  const androidPadding = Platform.OS === 'android' ? 40 : 16;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, { paddingTop: androidPadding }]}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>HTWA</Text>
          <Text style={styles.tagline}>Share the journey. Split the cost.</Text>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <Text style={styles.searchLabel}>Where are you going?</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>📍</Text>
            <TextInput
              style={styles.input}
              placeholder="City, town or university…"
              placeholderTextColor="#8A9BB0"
              value={destination}
              onChangeText={setDestination}
              returnKeyType="search"
              accessibilityLabel="Search city, town or university"
            />
          </View>
        </View>

        {/* Primary CTAs */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={[styles.ctaButton, styles.ctaFind]} accessibilityRole="button" accessibilityLabel="Find a ride">
            <Text style={styles.ctaIcon}>🔍</Text>
            <Text style={styles.ctaTitle}>Find a ride</Text>
            <Text style={styles.ctaSubtitle}>Search available journeys</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.ctaButton, styles.ctaOffer]} accessibilityRole="button" accessibilityLabel="Offer a ride">
            <Text style={styles.ctaIcon}>🚗</Text>
            <Text style={styles.ctaTitle}>Offer a ride</Text>
            <Text style={styles.ctaSubtitle}>Share your journey</Text>
          </TouchableOpacity>
        </View>

        {/* Popular routes */}
        <View style={styles.popularSection}>
          <Text style={styles.popularTitle}>Popular routes</Text>
          {POPULAR_ROUTES.map((route) => (
            <TouchableOpacity key={route.id} style={styles.routeRow} accessible={true} accessibilityRole="button" accessibilityLabel={`${route.from} to ${route.to}, ${route.price}`}>
              <View style={styles.routeDots}>
                <View style={[styles.dot, styles.dotFrom]} />
                <View style={styles.dotLine} />
                <View style={[styles.dot, styles.dotTo]} />
              </View>
              <View style={styles.routeText}>
                <Text style={styles.routeFrom}>{route.from}</Text>
                <Text style={styles.routeTo}>{route.to}</Text>
              </View>
              <Text style={styles.routePrice}>{route.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal note */}
        <Text style={styles.legalNote}>
          Drivers share costs only — never profit from a journey.
        </Text>

      </View>
    </SafeAreaView>
  );
}

export const POPULAR_ROUTES = [
  { id: '1', from: 'Dublin', to: 'Galway',  price: 'from €8' },
  { id: '2', from: 'Belfast', to: 'Dublin', price: 'from €10' },
  { id: '3', from: 'Cork', to: 'Limerick',  price: 'from €6' },
];

const BRAND_GREEN    = Colors.dark.brandGreen;
const DARK_BG        = Colors.dark.background;
const CARD_BG        = Colors.dark.surface;
const TEXT_PRIMARY   = Colors.dark.textPrimary;
const TEXT_SECONDARY = Colors.dark.textSecondary;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: BRAND_GREEN,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // Search
  searchSection: {
    marginBottom: 24,
  },
  searchLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#243447',
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },

  // CTAs
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  ctaButton: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  ctaFind: {
    backgroundColor: BRAND_GREEN,
  },
  ctaOffer: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#243447',
  },
  ctaIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  // Popular routes
  popularSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#243447',
  },
  popularTitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3047',
  },
  routeDots: {
    width: 20,
    alignItems: 'center',
    marginRight: 14,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFrom: {
    backgroundColor: BRAND_GREEN,
  },
  dotTo: {
    backgroundColor: TEXT_SECONDARY,
  },
  dotLine: {
    width: 1,
    height: 10,
    backgroundColor: '#243447',
  },
  routeText: {
    flex: 1,
    gap: 4,
  },
  routeFrom: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  routeTo: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  routePrice: {
    fontSize: 13,
    color: BRAND_GREEN,
    fontWeight: '600',
  },

  // Legal
  legalNote: {
    textAlign: 'center',
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 20,
    paddingBottom: 16,
    opacity: 0.7,
  },
});
