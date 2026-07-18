/**
 * __tests__/unit/BookingRequestScreen.test.tsx
 * Stage 36 — unit tests for app/booking-request.tsx
 * (+ 2A-c/d: per-journey nominated contact + waiver gate before booking)
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

// Contact card stub: reports a saved contact upward unless told otherwise.
let mockContactValue: { id: string } | null = { id: 'jc-1' };
jest.mock('../../components/NominatedContactCard', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    NominatedContactCard: (p: { testID?: string; onContact?: (c: unknown) => void }) => {
      ReactActual.useEffect(() => { p.onContact?.(mockContactValue); }, []);
      return <View testID={p.testID ?? 'contact-card'} />;
    },
  };
});

// Waiver stub: a pressable that flips acceptance.
jest.mock('../../components/WaiverAcceptance', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    WaiverAcceptance: (p: { accepted: boolean; onChange: (v: boolean) => void }) => (
      <View testID="waiver-acceptance">
        <TouchableOpacity testID="waiver-toggle" onPress={() => p.onChange(!p.accepted)} />
      </View>
    ),
  };
});

const mockHasAccepted = jest.fn();
const mockRecordWaiver = jest.fn();
jest.mock('../../services/waivers', () => ({
  hasAcceptedWaiver: (...a: unknown[]) => mockHasAccepted(...a),
  recordWaiverAcceptance: (...a: unknown[]) => mockRecordWaiver(...a),
}));

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

/** Accept the waiver via the stubbed checkbox. */
const acceptWaiver = () => fireEvent.press(screen.getByTestId('waiver-toggle'));

beforeEach(() => {
  jest.clearAllMocks();
  mockContactValue = { id: 'jc-1' };
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // no existing booking
  mockRpc.mockResolvedValue({ error: null });
  mockHasAccepted.mockResolvedValue(false);
  mockRecordWaiver.mockResolvedValue({ ok: true });
});

describe('BookingRequestScreen', () => {
  it('renders the booking summary', () => {
    render(<BookingRequestScreen />);
    expect(screen.getByTestId('confirm-seats')).toHaveTextContent('2');
    expect(screen.getByTestId('confirm-total')).toBeTruthy();
  });

  it('records the waiver, calls book_ride, and navigates on success', async () => {
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRecordWaiver).toHaveBeenCalledWith({ userId: 'u1', role: 'passenger', rideId: 'r1' });
    expect(mockRpc).toHaveBeenCalledWith('book_ride', {
      p_ride_id: 'r1', p_passenger_id: 'u1', p_seats: 2,
    });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/booking-success')),
    );
  });

  it('cannot book without accepting the waiver (button disabled)', () => {
    render(<BookingRequestScreen />);
    fireEvent.press(screen.getByTestId('confirm-button'));
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRecordWaiver).not.toHaveBeenCalled();
  });

  it('a failed waiver record blocks the booking with an error', async () => {
    mockRecordWaiver.mockResolvedValue({ ok: false, message: 'Could not record your acceptance. Please try again.' });
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(screen.getByTestId('booking-error')).toBeTruthy());
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('a prior acceptance skips the waiver UI and does not re-record', async () => {
    mockHasAccepted.mockResolvedValue(true);
    render(<BookingRequestScreen />);
    await waitFor(() => expect(screen.queryByTestId('waiver-acceptance')).toBeNull());
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRecordWaiver).not.toHaveBeenCalled();
  });

  it('blocks booking without a nominated contact', async () => {
    mockContactValue = null;
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('blocks re-booking an already-active booking (no RPC call)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'b1', status: 'pending' }, error: null });
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(screen.getByTestId('booking-error')).toBeTruthy());
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('shows a friendly message when there are not enough seats', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'not_enough_seats' } });
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() =>
      expect(screen.getByTestId('booking-error')).toHaveTextContent(/enough seats/),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('maps the RPC waiver_required error to friendly copy', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'waiver_required' } });
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() =>
      expect(screen.getByTestId('booking-error')).toHaveTextContent(/safety acknowledgment/),
    );
  });

  it('revives a cancelled booking (RPC still called)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'b1', status: 'cancelled' }, error: null });
    render(<BookingRequestScreen />);
    acceptWaiver();
    fireEvent.press(screen.getByTestId('confirm-button'));
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
  });
});
