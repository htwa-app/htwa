import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from '../context/AuthContext';

// Keep the native splash screen visible while fonts are loading.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Fonts are ready (or failed gracefully) — hide the native splash screen
      // and let the app route to our custom SplashScreen component.
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render the navigator until fonts are loaded.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </StripeProvider>
  );
}
