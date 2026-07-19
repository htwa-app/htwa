/**
 * __tests__/unit/RideDetailScreen.test.tsx
 * Stage 35 — unit tests for app/ride/[id].tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'r1' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});
jest.mock('../../components/RouteMapPlaceholder', () => {
  const { View } = require('react-native');
  return { RouteMapPlaceholder: () => <View testID="route-map-placeholder" /> };
});

const mockRide   = jest.fn();
const mockUser   = jest.fn();
const mockProfile = jest.fn();
const mockVerif  = jest.fn();
const mockMyBooking = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      // Fully chainable builder: any eq/in sequence, terminated by
      // single/maybeSingle, dispatched by table.
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.in = () => builder;
      builder.single = () => mockRide();
      builder.maybeSingle = () => {
        if (table === 'users')        return mockUser();
        if (table === 'profiles')     return mockProfile();
        if (table === 'verification') return mockVerif();
        if (table === 'bookings')     return mockMyBooking();
        return Promise.resolve({ data: null, error: null });
      };
      return builder;
    },
  },
}));

// Booked-state panels/services have their own suites — stub them here.
jest.mock('../../components/DriverVerifyPanel', () => {
  const { View } = require('react-native');
  return { DriverVerifyPanel: (p: { testID?: string }) => <View testID={p.testID ?? 'driver-verify-panel'} /> };
});
const mockCancelBooking = jest.fn();
jest.mock('../../services/bookings', () => ({
  cancelBookingAsPassenger: (...a: unknown[]) => mockCancelBooking(...a),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

// Block 4 — rates come from the DB (services/pricingRates). Mocked here.
const mockFetchRates = jest.fn();
jest.mock('../../services/pricingRates', () => ({
  fetchPricingRates: (...a: unknown[]) => mockFetchRates(...a),
}));

import RideDetailScreen from '../../app/ride/[id]';
import { TEST_PRICING_RATES } from '../fixtures/pricingRates';

const RIDE = {
  id: 'r1', driver_id: 'd1', from_location: 'Galway', to_location: 'Dublin',
  departure_datetime: '2026-06-01T09:00:00Z', seats_available: 3, seats_total: 4,
  cost_per_seat: 12, currency: 'EUR', distance_km: 200, women_only: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockRide.mockResolvedValue({ data: RIDE, error: null });
  mockUser.mockResolvedValue({ data: { full_name: 'Aoife Murphy' }, error: null });
  mockProfile.mockResolvedValue({ data: { university: 'NUIG', vehicle_details: { make: 'Toyota', model: 'Yaris', seats: 4, hasAC: true, dashcam: false } }, error: null });
  mockVerif.mockResolvedValue({ data: { status: 'approved' }, error: null });
  mockMyBooking.mockResolvedValue({ data: null, error: null }); // not booked
  mockCancelBooking.mockResolvedValue({ success: true, refunded: true, message: 'Booking cancelled. Full refund issued within 3–5 business days.' });
  mockFetchRates.mockResolvedValue(TEST_PRICING_RATES);
});

describe('RideDetailScreen', () => {
  it('shows a loading state initially', () => {
    mockRide.mockReturnValue(new Promise(() => {}));
    render(<RideDetailScreen />);
    expect(screen.getByTestId('ride-detail-loading')).toBeTruthy();
  });

  it('renders the driver and route once loaded', async () => {
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('driver-name')).toHaveTextContent('Aoife Murphy'));
    expect(screen.getByTestId('ride-from')).toHaveTextContent('Galway');
    expect(screen.getByTestId('ride-to')).toHaveTextContent('Dublin');
    expect(screen.getByTestId('driver-verified')).toBeTruthy();
  });

  it('increments the seat selector up to availability and navigates to booking', async () => {
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('book-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('seats-inc'));
    expect(screen.getByTestId('seats-wanted')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('book-button'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/booking-request?rideId=r1'));
  });

  it('shows the error state when the ride is not found', async () => {
    mockRide.mockResolvedValue({ data: null, error: { message: 'nope' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
  });

  it('retries the load when "Try again" is pressed on the error state', async () => {
    mockRide.mockResolvedValueOnce({ data: null, error: { message: 'nope' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
    mockRide.mockResolvedValue({ data: RIDE, error: null });
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByTestId('driver-name')).toBeTruthy());
  });

  it('shows the error state (not a false "unverified" driver) when the verification query errors', async () => {
    // A query error here must never silently render as "not verified" — that
    // would misrepresent a safety-relevant badge to a passenger.
    mockVerif.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
  });

  it('shows the error state (not a silently blank driver name) when the driver-name query errors', async () => {
    mockUser.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
  });

  it('shows the error state (not a silently missing vehicle) when the profile query errors', async () => {
    mockProfile.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
  });

  it('shows the luggage note when present (Block 8)', async () => {
    mockRide.mockResolvedValue({ data: { ...RIDE, luggage_note: 'one small case each' }, error: null });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-luggage-note')).toHaveTextContent('one small case each'));
  });

  it('shows a no-luggage placeholder when absent (Block 8)', async () => {
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-luggage-none')).toBeTruthy());
  });
});

// ─── Booked state (2A-b/e) ────────────────────────────────────────────────────

describe('RideDetailScreen — booked state', () => {
  const { Alert } = require('react-native');

  beforeEach(() => {
    mockMyBooking.mockResolvedValue({ data: { id: 'b1', status: 'confirmed' }, error: null });
  });

  it('shows booking status, driver-verify panel and chat instead of the booking card', async () => {
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('booked-section')).toBeTruthy());
    expect(screen.getByTestId('booking-status')).toHaveTextContent(/confirmed/);
    expect(screen.getByTestId('ride-driver-verify')).toBeTruthy();
    expect(screen.queryByTestId('book-button')).toBeNull();

    fireEvent.press(screen.getByTestId('chat-button'));
    expect(mockPush).toHaveBeenCalledWith('/chat/b1');
  });

  it('pending booking shows the waiting state', async () => {
    mockMyBooking.mockResolvedValue({ data: { id: 'b1', status: 'pending' }, error: null });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('booking-status')).toHaveTextContent(/waiting/));
  });

  it('driver-mismatch cancellation passes the reason through (full refund + report)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as Array<{ text: string; onPress?: () => void }>;
      buttons.find((b) => /didn't match/.test(b.text))?.onPress?.();
    });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));
    await waitFor(() => expect(mockCancelBooking).toHaveBeenCalledWith('b1', 'u1', RIDE.departure_datetime, 'driver_mismatch'));
    alertSpy.mockRestore();
  });

  it('standard cancellation shows the result message and clears the booked state', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as Array<{ text: string; onPress?: () => void }>;
      buttons.find((b) => b.text === 'Other reason')?.onPress?.();
    });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));
    await waitFor(() => expect(screen.getByTestId('cancel-message')).toHaveTextContent(/Full refund/));
    expect(screen.queryByTestId('booked-section')).toBeNull();
    alertSpy.mockRestore();
  });

  it('a failed cancellation keeps the booked state and shows the failure message', async () => {
    mockCancelBooking.mockResolvedValue({ success: false, refunded: false, message: 'Booking not found, not permitted, or already cancelled.' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as Array<{ text: string; onPress?: () => void }>;
      buttons.find((b) => b.text === 'Other reason')?.onPress?.();
    });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));
    await waitFor(() => expect(screen.getByTestId('cancel-message')).toHaveTextContent(/not permitted|not found/));
    expect(screen.getByTestId('booked-section')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('a failed my-booking query surfaces the error state, not a bookable ride', async () => {
    mockMyBooking.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
  });
});
