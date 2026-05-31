/**
 * __tests__/unit/PaymentConfirmationScreen.test.tsx
 * Stage 44 — unit tests for app/payment-confirmation.tsx
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ bookingId: 'b1', amount: '20', currency: 'EUR' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

import PaymentConfirmationScreen from '../../app/payment-confirmation';

beforeEach(() => jest.clearAllMocks());

describe('PaymentConfirmationScreen', () => {
  it('renders the receipt breakdown (ride cost, platform fee, total)', () => {
    render(<PaymentConfirmationScreen />);
    expect(screen.getByTestId('payment-confirmation-screen')).toBeTruthy();
    expect(screen.getByTestId('receipt-ride-cost')).toBeTruthy();
    expect(screen.getByTestId('receipt-platform-fee')).toBeTruthy();
    expect(screen.getByTestId('receipt-total')).toBeTruthy();
  });

  it('navigates to live trip on View trip', () => {
    render(<PaymentConfirmationScreen />);
    fireEvent.press(screen.getByTestId('view-trip-button'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/live-trip');
  });
});
