/**
 * __tests__/unit/TransactionHistoryScreen.test.tsx
 * Stage 46 — unit tests for app/transaction-history.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import TransactionHistoryScreen from '../../app/transaction-history';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
});

describe('TransactionHistoryScreen', () => {
  it('shows the empty state ONLY when the call succeeds with zero transactions', async () => {
    mockInvoke.mockResolvedValue({ data: { transactions: [] }, error: null });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('transactions-empty')).toBeTruthy());
    expect(screen.queryByTestId('transactions-error')).toBeNull();
  });

  it('a function error shows an error state with retry — never "No transactions yet"', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('transactions-error')).toBeTruthy());
    expect(screen.getByTestId('transactions-retry')).toBeTruthy();
    expect(screen.queryByTestId('transactions-empty')).toBeNull();
    spy.mockRestore();
  });

  it('a malformed response body (no transactions array) is an error, not an empty list', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('transactions-error')).toBeTruthy());
    expect(screen.queryByTestId('transactions-empty')).toBeNull();
  });

  it('a thrown invoke shows the error state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error('network down'));
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('transactions-error')).toBeTruthy());
    expect(screen.queryByTestId('transactions-empty')).toBeNull();
    spy.mockRestore();
  });

  it('retry re-calls the function and renders the data on success', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('transactions-retry')).toBeTruthy());

    mockInvoke.mockResolvedValue({
      data: { transactions: [{ id: 't9', type: 'payment', amount: 12.5, currency: 'EUR', description: 'Journey payment', date: '2026-07-22T10:00:00Z' }] },
      error: null,
    });
    fireEvent.press(screen.getByTestId('transactions-retry'));
    await waitFor(() => expect(screen.getByTestId('tx-t9')).toBeTruthy());
    expect(screen.queryByTestId('transactions-error')).toBeNull();
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('a partial response shows the rows it has plus an incomplete-list warning', async () => {
    mockInvoke.mockResolvedValue({
      data: { transactions: [{ id: 't1', type: 'payment', amount: 20, currency: 'EUR', description: 'Journey payment', date: '2026-07-22' }], partial: true },
      error: null,
    });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('tx-t1')).toBeTruthy());
    expect(screen.getByTestId('transactions-partial')).toBeTruthy();
  });

  it('renders a driver payout row as a received amount', async () => {
    mockInvoke.mockResolvedValue({
      data: { transactions: [{ id: 'pi_p1', type: 'payout', amount: 9, currency: 'EUR', description: 'Journey payout', date: '2026-07-22' }] },
      error: null,
    });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('tx-pi_p1')).toBeTruthy());
    expect(screen.getByText('payout')).toBeTruthy();
  });

  it('renders transactions returned by the edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { transactions: [{ id: 't1', type: 'payment', amount: 20, currency: 'EUR', description: 'Galway → Dublin', date: '2026-06-01' }] },
      error: null,
    });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('tx-t1')).toBeTruthy());
  });

  it('navigates back when the back button is pressed', async () => {
    mockInvoke.mockResolvedValue({ data: { transactions: [] }, error: null });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
