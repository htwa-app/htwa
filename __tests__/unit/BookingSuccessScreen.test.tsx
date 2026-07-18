/**
 * __tests__/unit/BookingSuccessScreen.test.tsx
 * Stage 37 — unit tests for app/booking-success.tsx
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ rideId: 'r1', seats: '2', total: '24.00', currency: 'EUR' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});
// The disclosure panel has its own suite; stub it (it imports lib/supabase).
jest.mock('../../components/DriverVerifyPanel', () => {
  const { View } = require('react-native');
  return { DriverVerifyPanel: (p: { testID?: string }) => <View testID={p.testID ?? 'driver-verify-panel'} /> };
});

import BookingSuccessScreen from '../../app/booking-success';

beforeEach(() => jest.clearAllMocks());

describe('BookingSuccessScreen', () => {
  it('renders the success screen with the total', () => {
    render(<BookingSuccessScreen />);
    expect(screen.getByTestId('booking-success-screen')).toBeTruthy();
    expect(screen.getByTestId('success-total')).toBeTruthy();
  });

  it('navigates to live trip on View trip', () => {
    render(<BookingSuccessScreen />);
    fireEvent.press(screen.getByTestId('view-trip-button'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/live-trip');
  });

  it('navigates back to search', () => {
    render(<BookingSuccessScreen />);
    fireEvent.press(screen.getByTestId('back-to-search-button'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
