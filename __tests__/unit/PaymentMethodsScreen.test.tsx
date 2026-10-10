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
const mockInitSheet = jest.fn();
const mockPresentSheet = jest.fn();
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({ initPaymentSheet: mockInitSheet, presentPaymentSheet: mockPresentSheet }),
}));

const mockGetAccount = jest.fn();
const mockStartConnect = jest.fn();
const mockCreateSetupIntent = jest.fn();
const mockGetUserCurrency = jest.fn();
jest.mock('../../services/payments', () => ({
  getUserCurrency: (...a: unknown[]) => mockGetUserCurrency(...a),
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
  mockGetUserCurrency.mockResolvedValue('EUR');
  mockCreateSetupIntent.mockResolvedValue({ ok: true, clientSecret: 'seti_secret' });
  mockInitSheet.mockResolvedValue({ error: null });
  mockPresentSheet.mockResolvedValue({ error: null });
});

describe('PaymentMethodsScreen', () => {
  it('shows both sections with default statuses', async () => {
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('connect-status')).toHaveTextContent('Not set up'));
    expect(screen.getByTestId('card-status')).toHaveTextContent('No card on file');
    expect(screen.getByTestId('setup-payouts')).toBeTruthy();
    expect(screen.getByTestId('add-card')).toBeTruthy();
  });

  it('shows a retryable error state instead of a fake "not set up" default when the load fails', async () => {
    mockGetAccount.mockRejectedValue(new Error('network down'));
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('payment-methods-error')).toBeTruthy());
    expect(screen.queryByTestId('connect-status')).toBeNull();

    mockGetAccount.mockResolvedValue({ connect_status: 'active', has_payment_method: true, payment_method_brand: 'Visa', payment_method_last4: '4242' });
    fireEvent.press(screen.getByTestId('payment-methods-retry'));
    await waitFor(() => expect(screen.getByTestId('connect-status')).toHaveTextContent('Active'));
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

describe('PaymentMethodsScreen — Apple Pay / Google Pay on card setup', () => {
  async function tapAddCard() {
    render(<PaymentMethodsScreen />);
    await waitFor(() => expect(screen.getByTestId('add-card')).toBeTruthy());
    fireEvent.press(screen.getByTestId('add-card'));
    await waitFor(() => expect(mockInitSheet).toHaveBeenCalled());
    return mockInitSheet.mock.calls[0][0];
  }

  it('passes applePay and googlePay (user currency) to initPaymentSheet', async () => {
    const opts = await tapAddCard();
    expect(opts.setupIntentClientSecret).toBe('seti_secret');
    expect(opts.applePay).toEqual({ merchantCountryCode: 'IE' });
    expect(opts.googlePay).toEqual({ merchantCountryCode: 'IE', currencyCode: 'EUR', testEnv: true });
  });

  it('omits Google Pay (not card entry or Apple Pay) when the currency lookup fails', async () => {
    mockGetUserCurrency.mockResolvedValue(null);
    const opts = await tapAddCard();
    expect(opts.googlePay).toBeUndefined();
    expect(opts.applePay).toEqual({ merchantCountryCode: 'IE' });
    expect(opts.setupIntentClientSecret).toBe('seti_secret');
  });
});
