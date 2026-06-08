/**
 * __tests__/unit/PaymentMethodsScreen.test.tsx
 * Block 7 — payment methods screen (status indicators + entry points).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({ initPaymentSheet: jest.fn(), presentPaymentSheet: jest.fn() }),
}));

const mockGetAccount = jest.fn();
const mockStartConnect = jest.fn();
const mockCreateSetupIntent = jest.fn();
jest.mock('../../services/payments', () => ({
  getPaymentAccount: (...a: unknown[]) => mockGetAccount(...a),
  startConnectOnboarding: (...a: unknown[]) => mockStartConnect(...a),
  createSetupIntent: (...a: unknown[]) => mockCreateSetupIntent(...a),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import PaymentMethodsScreen from '../../app/payment-methods';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockGetAccount.mockResolvedValue({ connect_status: 'none', has_payment_method: false, payment_method_brand: null, payment_method_last4: null });
});

describe('PaymentMethodsScreen', () => {
  it('shows both sections with default statuses', async () => {
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('connect-status')).toHaveTextContent('Not set up'));
    expect(screen.getByTestId('card-status')).toHaveTextContent('No card on file');
    expect(screen.getByTestId('setup-payouts')).toBeTruthy();
    expect(screen.getByTestId('add-card')).toBeTruthy();
  });

  it('shows active payout + saved card status', async () => {
    mockGetAccount.mockResolvedValue({ connect_status: 'active', has_payment_method: true, payment_method_brand: 'Visa', payment_method_last4: '4242' });
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('connect-status')).toHaveTextContent('Active'));
    expect(screen.getByTestId('card-status')).toHaveTextContent('Visa •••• 4242');
  });

  it('shows a graceful note when payout setup is unavailable', async () => {
    mockStartConnect.mockResolvedValue({ ok: false, reason: 'unavailable' });
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('setup-payouts')).toBeTruthy());
    fireEvent.press(screen.getByTestId('setup-payouts'));
    await waitFor(() => expect(screen.getByTestId('payment-note')).toHaveTextContent(/isn.t available yet/));
  });

  it('shows a graceful note when card setup is unavailable', async () => {
    mockCreateSetupIntent.mockResolvedValue({ ok: false, reason: 'unavailable' });
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('add-card')).toBeTruthy());
    fireEvent.press(screen.getByTestId('add-card'));
    await waitFor(() => expect(screen.getByTestId('payment-note')).toHaveTextContent(/isn.t available yet/));
  });
});
