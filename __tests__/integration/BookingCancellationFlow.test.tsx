/**
 * __tests__/integration/BookingCancellationFlow.test.tsx
 *
 * Integration: ride-detail booked state driving the REAL services/bookings
 * cancellation + refund logic (only the supabase client is mocked). Covers
 * the standard >24h full-refund path and the driver-mismatch path (2A-e:
 * full refund regardless of window + account flagged server-side by the
 * create-refund Edge Function).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'r1' }),
}));
jest.mock('../../components/DriverVerifyPanel', () => {
  const { View } = require('react-native');
  return { DriverVerifyPanel: (p: { testID?: string }) => <View testID={p.testID ?? 'driver-verify-panel'} /> };
});
jest.mock('../../services/pricingRates', () => ({
  fetchPricingRates: jest.fn().mockResolvedValue({
    roiBands: [{ upperKm: 999999, rates: { le1200: 0.3, cc1201to1500: 0.35, ge1501: 0.4 } }],
    ukBands: [{ upperMiles: 999999, rate: 0.45 }],
    serviceChargeRate: 0.1,
    bookingFee: 2,
  }),
}));

// ── Supabase mock shared by the SCREEN and the REAL bookings service ─────────

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: { message: string } | null };
let mockHandler: (table: string, calls: Call[]) => Result;
const mockInvoke = jest.fn();
const mockRpc = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const calls: Call[] = [];
      const builder: Record<string, unknown> = {};
      ['select', 'eq', 'in', 'order', 'limit', 'update', 'insert', 'upsert'].forEach((m) => {
        builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder; };
      });
      builder.single = () => { calls.push({ method: 'single', args: [] }); return Promise.resolve(mockHandler(table, calls)); };
      builder.maybeSingle = () => { calls.push({ method: 'maybeSingle', args: [] }); return Promise.resolve(mockHandler(table, calls)); };
      builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(mockHandler(table, calls)).then(resolve);
      return builder;
    },
    rpc: (...a: unknown[]) => mockRpc(...a),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import RideDetailScreen from '../../app/ride/[id]';

const FUTURE_DEPARTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const SOON_DEPARTURE = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

function baseHandler(departure: string): (table: string, calls: Call[]) => Result {
  return (table, calls) => {
    const terminal = calls[calls.length - 1]?.method;
    if (table === 'rides' && terminal === 'single') {
      return {
        data: {
          id: 'r1', driver_id: 'd1', from_location: 'Galway', to_location: 'Dublin',
          departure_datetime: departure, seats_available: 2, seats_total: 4,
          cost_per_seat: 10, currency: 'EUR', distance_km: 200, women_only: false, luggage_note: null,
        },
        error: null,
      };
    }
    if (table === 'users') return { data: { full_name: 'Aoife' }, error: null };
    if (table === 'profiles') return { data: { university: null, vehicle_details: null }, error: null };
    if (table === 'verification') return { data: { id_verified: true, selfie_verified: true }, error: null };
    if (table === 'bookings' && terminal === 'maybeSingle') {
      return { data: { id: 'b1', status: 'confirmed', seats_booked: 1, payment_intent_id: null }, error: null };
    }
    if (table === 'bookings' && calls.some((c) => c.method === 'update')) {
      // The REAL service's cancel UPDATE ... select('seats_booked, ride_id')
      return { data: [{ seats_booked: 1, ride_id: 'r1' }], error: null };
    }
    return { data: terminal === 'maybeSingle' || terminal === 'single' ? null : [], error: null };
  };
}

function pressAlertButton(matcher: RegExp): jest.SpyInstance {
  return jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => {
    const buttons = args[2] as Array<{ text: string; onPress?: () => void }>;
    buttons.find((b) => matcher.test(b.text))?.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'p1' } });
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockInvoke.mockResolvedValue({ data: { refundId: 're_1', status: 'succeeded' }, error: null });
});

describe('booking cancellation through the real service', () => {
  it('standard cancel >24h: booking cancelled, seat restored via RPC, full refund requested', async () => {
    mockHandler = baseHandler(FUTURE_DEPARTURE);
    const alertSpy = pressAlertButton(/Other reason/);
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));

    await waitFor(() => expect(screen.getByTestId('cancel-message')).toHaveTextContent(/Full refund/));
    expect(mockRpc).toHaveBeenCalledWith('restore_ride_seats', { p_ride_id: 'r1', p_seats: 1 });
    expect(mockInvoke).toHaveBeenCalledWith('create-refund', { body: { bookingId: 'b1', reason: 'passenger_cancelled' } });
    alertSpy.mockRestore();
  });

  it('standard cancel <24h: no refund call, honest message', async () => {
    mockHandler = baseHandler(SOON_DEPARTURE);
    const alertSpy = pressAlertButton(/Other reason/);
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));

    await waitFor(() => expect(screen.getByTestId('cancel-message')).toHaveTextContent(/No refund/));
    expect(mockInvoke).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('driver-mismatch <24h: FULL refund anyway + driver reported (2A-e)', async () => {
    mockHandler = baseHandler(SOON_DEPARTURE);
    const alertSpy = pressAlertButton(/didn't match/);
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));

    await waitFor(() => expect(screen.getByTestId('cancel-message')).toHaveTextContent(/driver reported/i));
    expect(mockInvoke).toHaveBeenCalledWith('create-refund', { body: { bookingId: 'b1', reason: 'driver_mismatch' } });
    alertSpy.mockRestore();
  });

  it('zero-row cancel (already cancelled elsewhere) surfaces failure, keeps booked state, no refund call', async () => {
    mockHandler = (table, calls) => {
      if (table === 'bookings' && calls.some((c) => c.method === 'update')) {
        return { data: [], error: null };
      }
      return baseHandler(FUTURE_DEPARTURE)(table, calls);
    };
    const alertSpy = pressAlertButton(/Other reason/);
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('cancel-booking-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('cancel-booking-button'));

    await waitFor(() => expect(screen.getByTestId('cancel-message')).toHaveTextContent(/not found|permitted|cancelled/i));
    expect(screen.getByTestId('booked-section')).toBeTruthy();
    expect(mockInvoke).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
