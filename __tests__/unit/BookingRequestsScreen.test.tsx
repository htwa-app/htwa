/**
 * __tests__/unit/BookingRequestsScreen.test.tsx
 * Unit tests for app/booking-requests/[rideId].tsx — the driver's
 * booking-acceptance screen.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TEST_PRICING_RATES } from '../fixtures/pricingRates';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ rideId: 'r1' }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockAcceptBooking = jest.fn();
jest.mock('../../services/chat', () => ({
  acceptBooking: (...a: unknown[]) => mockAcceptBooking(...a),
}));

const mockDeclineBooking = jest.fn();
jest.mock('../../services/bookings', () => ({
  declineBooking: (...a: unknown[]) => mockDeclineBooking(...a),
}));

const mockFetchRates = jest.fn();
jest.mock('../../services/pricingRates', () => ({
  fetchPricingRates: (...a: unknown[]) => mockFetchRates(...a),
}));

const mockRideResult = jest.fn();
const mockBookingsResult = jest.fn();
const mockUsersResult = jest.fn();
const mockVerifsResult = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'rides') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => mockRideResult() }) }) }) };
      }
      if (table === 'bookings') {
        // select().eq().neq().order() is directly awaited (thenable)
        const q: Record<string, unknown> = {};
        q.select = () => q;
        q.eq = () => q;
        q.neq = () => q;
        q.order = () => q;
        (q as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(mockBookingsResult());
        return q;
      }
      if (table === 'users') {
        return { select: () => ({ in: () => mockUsersResult() }) };
      }
      // verification
      return { select: () => ({ in: () => mockVerifsResult() }) };
    },
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import BookingRequestsScreen from '../../app/booking-requests/[rideId]';

const RIDE = {
  id: 'r1', from_location: 'Galway', to_location: 'Dublin',
  departure_datetime: '2099-06-01T09:00:00Z', cost_per_seat: 12, currency: 'EUR',
  seats_available: 2, seats_total: 4,
};

const PENDING_BOOKING = { id: 'b1', passenger_id: 'p1', seats_booked: 1, status: 'pending', created_at: '2026-05-01T09:00:00Z' };
const CONFIRMED_BOOKING = { id: 'b2', passenger_id: 'p2', seats_booked: 2, status: 'confirmed', created_at: '2026-05-02T09:00:00Z' };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'd1' } });
  mockRideResult.mockResolvedValue({ data: RIDE, error: null });
  mockFetchRates.mockResolvedValue(TEST_PRICING_RATES);
  mockBookingsResult.mockResolvedValue({ data: [PENDING_BOOKING], error: null });
  mockUsersResult.mockResolvedValue({ data: [{ id: 'p1', full_name: 'Aoife Murphy' }], error: null });
  mockVerifsResult.mockResolvedValue({ data: [{ user_id: 'p1', id_verified: true, selfie_verified: true }], error: null });
});

describe('BookingRequestsScreen — loading & rendering', () => {
  it('shows a loading state initially', () => {
    mockRideResult.mockReturnValue(new Promise(() => {}));
    render(<BookingRequestsScreen />);
    expect(screen.getByTestId('booking-requests-loading')).toBeTruthy();
  });

  it('renders the ride context and a pending request card', async () => {
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-context')).toBeTruthy());
    expect(screen.getByText('Galway → Dublin')).toBeTruthy();
    expect(screen.getByTestId('request-name-b1')).toHaveTextContent('Aoife Murphy');
    expect(screen.getByTestId('request-verified-b1')).toBeTruthy();
    expect(screen.getByText('1 seat requested')).toBeTruthy();
  });

  it('shows the price breakdown using the fixed pricing model (driverSeatPrice + fees)', async () => {
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('request-price-b1')).toBeTruthy());
    // cost_per_seat 12 is shown as the headline base; breakdown toggle exists.
    expect(screen.getByTestId('request-price-b1-toggle')).toBeTruthy();
  });

  it('shows the empty state when there are no requests', async () => {
    mockBookingsResult.mockResolvedValue({ data: [], error: null });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('requests-empty')).toBeTruthy());
  });

  it('shows a decided-status badge (not accept/decline buttons) for a confirmed booking', async () => {
    mockBookingsResult.mockResolvedValue({ data: [CONFIRMED_BOOKING], error: null });
    mockUsersResult.mockResolvedValue({ data: [{ id: 'p2', full_name: 'Cian Byrne' }], error: null });
    mockVerifsResult.mockResolvedValue({ data: [], error: null });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('request-status-b2')).toHaveTextContent('Accepted'));
    expect(screen.queryByTestId('accept-button-b2')).toBeNull();
    expect(screen.queryByTestId('decline-button-b2')).toBeNull();
  });
});

describe('BookingRequestsScreen — errors', () => {
  it('shows an error state with retry when the ride query errors', async () => {
    mockRideResult.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
  });

  it('shows an error state when the ride is not the current driver\'s own', async () => {
    mockRideResult.mockResolvedValue({ data: null, error: null });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
  });

  it('shows an error state (not an empty list) when the bookings query errors', async () => {
    mockBookingsResult.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
    expect(screen.queryByTestId('requests-empty')).toBeNull();
  });

  it('shows an error state when the users batch query errors', async () => {
    mockUsersResult.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
  });

  it('shows an error state when the verification batch query errors', async () => {
    mockVerifsResult.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
  });

  it('shows an error state when pricing rates fail to load', async () => {
    mockFetchRates.mockRejectedValue(new Error('rates unavailable'));
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
  });

  it('retries the load when "Try again" is pressed', async () => {
    mockRideResult.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-requests-error')).toBeTruthy());
    mockRideResult.mockResolvedValue({ data: RIDE, error: null });
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByTestId('ride-context')).toBeTruthy());
  });
});

describe('BookingRequestsScreen — accept', () => {
  it('accepts a request and refreshes the list', async () => {
    mockAcceptBooking.mockResolvedValue({ ok: true });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('accept-button-b1')).toBeTruthy());
    mockBookingsResult.mockResolvedValue({ data: [{ ...PENDING_BOOKING, status: 'confirmed' }], error: null });
    fireEvent.press(screen.getByTestId('accept-button-b1'));
    expect(mockAcceptBooking).toHaveBeenCalledWith('b1');
    await waitFor(() => expect(screen.getByTestId('request-status-b1')).toHaveTextContent('Accepted'));
  });

  it('shows a per-row error (does not crash) when accept fails, and clears the busy state', async () => {
    mockAcceptBooking.mockResolvedValue({ ok: false, error: 'Booking could not be accepted (not found or not permitted).' });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('accept-button-b1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-button-b1'));
    await waitFor(() => expect(screen.getByTestId('request-error-b1')).toHaveTextContent(/not found|permitted/i));
    // Buttons must not be left stuck disabled after the failure.
    expect(screen.getByTestId('accept-button-b1').props.accessibilityState?.disabled).toBe(false);
  });

  it('shows a generic per-row error when accept throws', async () => {
    mockAcceptBooking.mockRejectedValue(new Error('network'));
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('accept-button-b1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-button-b1'));
    await waitFor(() => expect(screen.getByTestId('request-error-b1')).toBeTruthy());
  });
});

describe('BookingRequestsScreen — decline', () => {
  it('declines a request and refreshes the list', async () => {
    mockDeclineBooking.mockResolvedValue({ ok: true });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('decline-button-b1')).toBeTruthy());
    mockBookingsResult.mockResolvedValue({ data: [{ ...PENDING_BOOKING, status: 'declined' }], error: null });
    fireEvent.press(screen.getByTestId('decline-button-b1'));
    expect(mockDeclineBooking).toHaveBeenCalledWith('b1');
    await waitFor(() => expect(screen.getByTestId('request-status-b1')).toHaveTextContent('Declined'));
  });

  it('shows a per-row error (does not crash) when decline fails', async () => {
    mockDeclineBooking.mockResolvedValue({ ok: false, error: 'Booking not found, not permitted, or already decided.' });
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('decline-button-b1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('decline-button-b1'));
    await waitFor(() => expect(screen.getByTestId('request-error-b1')).toHaveTextContent(/not found|permitted|decided/i));
  });
});

describe('BookingRequestsScreen — navigation', () => {
  it('navigates back when the back button is pressed', async () => {
    render(<BookingRequestsScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
