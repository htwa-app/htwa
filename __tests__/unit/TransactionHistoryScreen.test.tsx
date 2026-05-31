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
  it('shows the empty state when the edge function is not yet deployed', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'not deployed' } });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('transactions-empty')).toBeTruthy());
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
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'x' } });
    render(<TransactionHistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
