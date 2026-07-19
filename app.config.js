/**
 * app.config.js
 *
 * Replaces the previous static app.json (converted 19 Jul 2026) so native
 * config can read EXPO_PUBLIC_* values from the environment at build time,
 * instead of ever needing a real key hardcoded into a committed file.
 *
 * Currently only used for Android's native Google Maps SDK key
 * (android.config.googleMaps.apiKey, baked into AndroidManifest.xml at
 * prebuild time) — everything else is unchanged from the old app.json.
 * Falls back to the older EXPO_PUBLIC_GOOGLE_MAPS_API_KEY name, same
 * fallback used everywhere else in the app (services/routes.ts,
 * components/JourneyMap.tsx). If neither is set, the android.config field is
 * omitted entirely rather than shipped empty.
 */

const googleMapsKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: 'htwa',
    slug: 'htwa',
    scheme: 'htwa',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.htwa.app',
      entitlements: {
        'aps-environment': 'development',
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.htwa.app',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      ...(googleMapsKey ? { config: { googleMaps: { apiKey: googleMapsKey } } } : {}),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      contactEmail: 'hello@htwa-app.com',
      router: {},
      eas: {
        projectId: '2d69d8ec-3b00-4236-bc91-50e12577c738',
      },
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-notifications',
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.htwa',
        },
      ],
      '@react-native-community/datetimepicker',
    ],
    owner: 'htwa-app',
  },
};
