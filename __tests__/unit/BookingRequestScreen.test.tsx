/**
 * __tests__/unit/BookingRequestScreen.test.tsx
 * Stage 36 — unit tests for app/booking-request.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ rideId: 'r1', seats: '2', pricePerSeat: '10', currency: 'EUR' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockMaybeSingle = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: (...a: unknown[]) => mockMaybeSingle(...a) }) }) }),
    }),
    rpc: (...a: unknown[]) => mockRpc(...a),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import BookingRequestScreen from '../../app/booking-request';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // no existing booking
  mockRpc.mockResolvedValue({ error: null });
});

describe('BookingRequestScreen', () => {
  it('renders the booking summary', () => {
    render(<BookingRequestScreen />);
    expect(screen.getByTestId('confirm-seats')).toHaveTextContent('2');
    expect(screen.getByTestId('confirm-total')).toBeTruthy();
  });

  it('calls book_ride RPC with the right args and navigates on success', async () => {
    render(<BookingRequestScreen />);
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith('book_ride', {
      p_ride_id: 'r1', p_passenger_id: 'u1', p_seats: 2,
    });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/booking-success')),
    );
  });

  it('blocks re-booking an already-active booking (no RPC call)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'b1', status: 'pending' }, error: null });
    render(<BookingRequestScreen />);
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(screen.getByTestId('booking-error')).toBeTruthy());
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('shows a friendly message when there are not enough seats', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'not_enough_seats' } });
    render(<BookingRequestScreen />);
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() =>
      expect(screen.getByTestId('booking-error')).toHaveTextContent(/enough seats/),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('revives a cancelled booking (RPC still called)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'b1', status: 'cancelled' }, error: null });
    render(<BookingRequestScreen />);
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
  });
});
