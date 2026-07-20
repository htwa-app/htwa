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
      // expo-image-picker@17's own Android config plugin (withImagePicker.ts)
      // never actually adds android.permission.CAMERA despite its README
      // claiming it does — it only ever removes it when explicitly disabled.
      // Without this, requestCameraPermissionsAsync()/launchCameraAsync() is
      // silently denied on Android (no declared permission = no runtime grant),
      // breaking the mandatory ID/selfie capture flow. Force it here instead.
      permissions: ['android.permission.CAMERA'],
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
      // Required so iOS actually grants (rather than hard-crashing on) camera/
      // photo-library access — expo-image-picker was in use (selfie, photo ID,
      // driver photos, profile photo) without ever being registered here, so
      // the built Info.plist had no NSCameraUsageDescription/
      // NSPhotoLibraryUsageDescription at all. iOS terminates the process
      // outright when an app requests either without the description string
      // present — not a catchable JS error, which is why this went unnoticed
      // in Jest (the native picker is always mocked there).
      [
        'expo-image-picker',
        {
          photosPermission: 'htwa needs access to your photos to upload identity, driver, or profile verification images.',
          cameraPermission: 'htwa needs your camera to take a live selfie for identity verification.',
          // No audio/video capture anywhere in the app — skip the mic
          // permission and its Android RECORD_AUDIO entry entirely.
          microphonePermission: false,
        },
      ],
    ],
    owner: 'htwa-app',
  },
};
