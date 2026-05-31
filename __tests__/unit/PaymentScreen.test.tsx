/**
 * __tests__/unit/PaymentScreen.test.tsx
 * Stage 42 — unit tests for app/payment.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockInitSheet = jest.fn();
const mockPresentSheet = jest.fn();
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({ initPaymentSheet: mockInitSheet, presentPaymentSheet: mockPresentSheet }),
}));

const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import PaymentScreen from '../../app/payment';

const BASE = { bookingId: 'b1', rideId: 'r1', amount: '20', currency: 'EUR', driverStripeAccountId: 'acct_1' };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { ...BASE };
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockInvoke.mockResolvedValue({ data: { clientSecret: 'cs_123' }, error: null });
  mockInitSheet.mockResolvedValue({ error: null });
  mockPresentSheet.mockResolvedValue({ error: null });
});

describe('PaymentScreen', () => {
  it('renders the cost breakdown', () => {
    render(<PaymentScreen />);
    expect(screen.getByTestId('ride-cost')).toBeTruthy();
    expect(screen.getByTestId('platform-fee')).toBeTruthy();
    expect(screen.getByTestId('payment-total')).toBeTruthy();
  });

  it('shows an error and does not init when booking details are missing', async () => {
    mockParams = { amount: '20', currency: 'EUR' }; // no bookingId / rideId
    render(<PaymentScreen />);
    await waitFor(() => expect(screen.getByTestId('payment-error')).toHaveTextContent(/Missing booking details/));
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('initialises the payment sheet from the edge function client secret', async () => {
    render(<PaymentScreen />);
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('create-payment-intent', expect.anything()));
    await waitFor(() => expect(mockInitSheet).toHaveBeenCalled());
  });

  it('presents the sheet and navigates to confirmation on pay', async () => {
    render(<PaymentScreen />);
    await waitFor(() => expect(screen.getByTestId('pay-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('pay-button'));
    await waitFor(() => expect(mockPresentSheet).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/payment-confirmation')),
    );
  });
});
