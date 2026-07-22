/**
 * __tests__/unit/OfferRideScreen.test.tsx
 * Stage 31 — unit tests for app/offer-ride.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: mockPush }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockProfile = jest.fn();
const mockIncrements = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'driver_pricing_profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => mockProfile() }) }) };
      }
      // driver_mileage_increments — select().eq() is awaitable (thenable)
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      (q as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(mockIncrements());
      return q;
    },
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

// Block 2 — distance is auto-calculated via the Routes helper (no manual input).
const mockComputeDistance = jest.fn();
const mockGetDriverVerification = jest.fn();
jest.mock('../../services/driverVerification', () => ({
  getDriverVerification: (...a: unknown[]) => mockGetDriverVerification(...a),
}));

jest.mock('../../services/routes', () => ({
  computeRouteDistance: (...args: unknown[]) => mockComputeDistance(...args),
}));
jest.mock('../../utils/currency', () => ({
  formatCurrency: (n: number, c: string) => `${c === 'EUR' ? '€' : '£'}${n.toFixed(2)}`,
}));

// Block 4 — rates come from the DB (services/pricingRates). Mocked here.
const mockFetchRates = jest.fn();
jest.mock('../../services/pricingRates', () => ({
  fetchPricingRates: (...a: unknown[]) => mockFetchRates(...a),
}));

// RouteInput mock — no type annotations in factory (Jest hoisting rule)
// DateTimeField is a native-picker field; stub it as a plain TextInput so the
// existing changeText-based tests keep exercising the same string contracts.
jest.mock('../../components/DateTimeField', () => {
  const { TextInput } = require('react-native');
  return {
    DateTimeField: (props: Record<string, unknown>) => (
      <TextInput
        testID={props.testID as string}
        value={(props.value as string) ?? ''}
        onChangeText={props.onChange}
      />
    ),
  };
});

jest.mock('../../components/RouteInput', () => {
  const { View, TextInput, TouchableOpacity } = require('react-native');
  return {
    RouteInput: (props: Record<string, unknown>) => (
      <View testID={(props.testID as string) ?? 'route-input'}>
        <TextInput
          testID="from-input"
          value={(props.from as string) ?? ''}
          onChangeText={props.onFromChange}
        />
        <TextInput
          testID="to-input"
          value={(props.to as string) ?? ''}
          onChangeText={props.onToChange}
        />
        {/* Test-only affordances for the coordinate-tracking + swap props. */}
        <TouchableOpacity
          testID="route-input-pick-from"
          onPress={() => {
            const fn = props.onFromPlaceSelect;
            if (typeof fn === 'function') fn({ lat: 53.27, lng: -9.05 });
          }}
        />
        <TouchableOpacity
          testID="route-input-pick-to"
          onPress={() => {
            const fn = props.onToPlaceSelect;
            if (typeof fn === 'function') fn({ lat: 53.34, lng: -6.26 });
          }}
        />
        <TouchableOpacity
          testID="route-input-swap"
          onPress={() => {
            const fn = props.onSwap;
            if (typeof fn === 'function') fn();
          }}
        />
      </View>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDriverVerification.mockResolvedValue({ ok: true, verification: { status: 'approved' } });
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockProfile.mockResolvedValue({ data: { tax_residence: 'ROI', engine_cc: 'le1200' }, error: null });
  mockIncrements.mockResolvedValue({ data: [], error: null });
  mockComputeDistance.mockResolvedValue({ ok: true, distance: 210, unit: 'km' });
  mockFetchRates.mockResolvedValue(TEST_PRICING_RATES);
});

import OfferRideScreen from '../../app/offer-ride';
import { TEST_PRICING_RATES } from '../fixtures/pricingRates';

describe('OfferRideScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<OfferRideScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('offer-ride-screen')).toBeTruthy());
  });
});

describe('OfferRideScreen — inputs', () => {
  it('renders from and to inputs via RouteInput', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    expect(screen.getByTestId('to-input')).toBeTruthy();
  });

  it('renders seats stepper with default 3', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-value')).toBeTruthy());
    expect(screen.getByTestId('seats-value').props.children).toBe(3);
  });

  it('increments seats when + is pressed', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-increment')).toBeTruthy());
    fireEvent.press(screen.getByTestId('seats-increment'));
    expect(screen.getByTestId('seats-value').props.children).toBe(4);
  });

  it('decrements seats when - is pressed', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-decrement')).toBeTruthy());
    fireEvent.press(screen.getByTestId('seats-decrement'));
    expect(screen.getByTestId('seats-value').props.children).toBe(2);
  });

  it('renders women-only toggle', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('women-only-toggle')).toBeTruthy());
  });

  it('renders date and time inputs', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('date-input')).toBeTruthy());
    expect(screen.getByTestId('time-input')).toBeTruthy();
  });
});

describe('OfferRideScreen — review button', () => {
  it('is disabled when form is incomplete', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('review-button')).toBeTruthy());
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('is enabled once the route distance is auto-calculated and fields are filled', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    // distance + price auto-fill from the mocked Routes helper; no manual entry
    await waitFor(
      () => expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(false),
      { timeout: 2000 },
    );
  });
});

describe('OfferRideScreen — route swap preserves resolved coordinates (PR #33 finding)', () => {
  it('swapping after picking both Places suggestions carries the coordinates over, not nulling them', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.press(screen.getByTestId('route-input-pick-from'));
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    fireEvent.press(screen.getByTestId('route-input-pick-to'));
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    await waitFor(
      () => expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(false),
      { timeout: 2000 },
    );

    fireEvent.press(screen.getByTestId('route-input-swap'));
    fireEvent.press(screen.getByTestId('review-button'));
    const params = new URLSearchParams(String(mockPush.mock.calls[0][0]).split('?')[1]);

    // Swapped: the "from" coords are now what was picked for "to", and vice versa.
    expect(params.get('fromLat')).toBe('53.34');
    expect(params.get('fromLng')).toBe('-6.26');
    expect(params.get('toLat')).toBe('53.27');
    expect(params.get('toLng')).toBe('-9.05');
  });
});

describe('OfferRideScreen — distanceKm persistence unit (regression)', () => {
  async function fillAndReview() {
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'A');
    fireEvent.changeText(screen.getByTestId('to-input'), 'B');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    await waitFor(
      () => expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(false),
      { timeout: 2000 },
    );
    fireEvent.press(screen.getByTestId('review-button'));
    return new URLSearchParams(String(mockPush.mock.calls[0][0]).split('?')[1]);
  }

  it('ROI/km journey persists distanceKm unchanged', async () => {
    // default mock = ROI; computeRouteDistance returns 210 km
    render(<OfferRideScreen />);
    const params = await fillAndReview();
    expect(Number(params.get('distanceKm'))).toBeCloseTo(210, 5);
  });

  it('UK/miles journey converts miles → km before persisting distanceKm', async () => {
    // UK drivers still record an engine_cc at onboarding (it just isn't used for
    // UK pricing), so a real UK profile has a non-null engine_cc.
    mockProfile.mockResolvedValue({ data: { tax_residence: 'UK', engine_cc: 'ge1501' }, error: null });
    mockComputeDistance.mockResolvedValue({ ok: true, distance: 100, unit: 'miles' });
    render(<OfferRideScreen />);
    const params = await fillAndReview();
    // 100 miles × 1.60934 = 160.934 km
    expect(Number(params.get('distanceKm'))).toBeCloseTo(160.934, 3);
  });
});

describe('OfferRideScreen — pricing fails loud when DB rates are unavailable', () => {
  it('shows a pricing-unavailable message, no price, and keeps review disabled', async () => {
    mockFetchRates.mockRejectedValue(new Error('rates down'));
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    // distance still resolves, but with no rates the price must NOT compute.
    await waitFor(() => expect(screen.getByTestId('rates-unavailable')).toBeTruthy(), { timeout: 2000 });
    expect(screen.queryByTestId('driver-seat-price')).toBeNull();
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });
});

describe('OfferRideScreen — Block 2 auto distance', () => {
  it('shows the calculated distance (driver never types it)', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    await waitFor(() => expect(screen.getByTestId('distance-value')).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByTestId('distance-value')).toHaveTextContent(/210\s*km/);
    expect(screen.queryByTestId('distance-input')).toBeNull(); // manual input removed
  });

  it('shows an unavailable state when distance calculation fails', async () => {
    mockComputeDistance.mockResolvedValue({ ok: false, reason: 'unavailable' });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    await waitFor(() => expect(screen.getByTestId('distance-unavailable')).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });
});

describe('OfferRideScreen — Block 3 seat cap', () => {
  it('caps seats at 4 and shows the verification note when not verified', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-increment')).toBeTruthy());
    for (let i = 0; i < 10; i++) fireEvent.press(screen.getByTestId('seats-increment'));
    expect(screen.getByTestId('seats-value').props.children).toBe(4);
    expect(screen.getByTestId('seats-cap-note')).toBeTruthy();
  });
});

describe('OfferRideScreen — Block 8 luggage note', () => {
  it('passes the optional luggage note into the confirm params', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    fireEvent.changeText(screen.getByTestId('luggage-input'), 'one small case each');
    await waitFor(
      () => expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(false),
      { timeout: 2000 },
    );
    fireEvent.press(screen.getByTestId('review-button'));
    expect(String(mockPush.mock.calls[0][0])).toContain('luggageNote=one+small+case+each');
  });
});

describe('OfferRideScreen — Block 4 fixed cost-share pricing', () => {
  it('shows a computed cost-share and no editable price input', async () => {
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    await waitFor(() => expect(screen.getByTestId('driver-seat-price')).toBeTruthy(), { timeout: 2000 });
    // 210 km × €0.4180 = €87.78; ÷ 5 (standard vehicle capacity) = €17.55
    expect(screen.getByTestId('driver-seat-price')).toHaveTextContent(/17\.55/);
    expect(screen.queryByTestId('price-input')).toBeNull(); // driver can't edit the price
  });

  it('shows the complete-setup banner and disables review when no pricing profile', async () => {
    mockProfile.mockResolvedValue({ data: null, error: null });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('complete-setup-banner')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    await waitFor(() => expect(screen.getByTestId('distance-value')).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('shows a load-error banner (not the "complete setup" banner) when the profile query errors', async () => {
    // A driver who HAS already set up their profile should never be sent back
    // through onboarding just because a query failed.
    mockProfile.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('profile-load-error')).toBeTruthy());
    expect(screen.queryByTestId('complete-setup-banner')).toBeNull();
  });

  it('blocks review (does not silently price at 0 cumulative mileage) when the increments query errors', async () => {
    mockIncrements.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('profile-load-error')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
    await waitFor(() => expect(screen.getByTestId('distance-value')).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });
});

describe('OfferRideScreen — driver verification gate (round-2 fix #2)', () => {
  async function fillEverything() {
    await waitFor(() => expect(screen.getByTestId('from-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('from-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Galway');
    fireEvent.changeText(screen.getByTestId('date-input'), '2026-06-01');
    fireEvent.changeText(screen.getByTestId('time-input'), '09:00');
  }

  it('no submission yet: banner shown, Review stays disabled even with a complete form', async () => {
    mockGetDriverVerification.mockResolvedValue({ ok: true, verification: null });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('driver-verification-banner')).toBeTruthy());
    await fillEverything();
    await waitFor(() => expect(screen.getByTestId('review-button')).toBeTruthy());
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('pending: distinct banner copy, Review disabled', async () => {
    mockGetDriverVerification.mockResolvedValue({ ok: true, verification: { status: 'pending' } });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('driver-verification-banner')).toHaveTextContent(/under review/i));
    await fillEverything();
    expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('rejected: fix-and-resubmit copy, banner navigates to driver verification', async () => {
    mockGetDriverVerification.mockResolvedValue({ ok: true, verification: { status: 'rejected' } });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('driver-verification-banner')).toHaveTextContent(/wasn't approved/i));
    fireEvent.press(screen.getByTestId('driver-verification-banner'));
    expect(mockPush).toHaveBeenCalledWith('/driver-verification');
  });

  it('approved: no banner, Review enables with a complete form', async () => {
    render(<OfferRideScreen />);
    await fillEverything();
    await waitFor(
      () => expect(screen.getByTestId('review-button').props.accessibilityState?.disabled).toBe(false),
      { timeout: 2000 },
    );
    expect(screen.queryByTestId('driver-verification-banner')).toBeNull();
  });

  it('a failed verification check blocks with the load-error state — never silently passes', async () => {
    mockGetDriverVerification.mockResolvedValue({ ok: false });
    render(<OfferRideScreen />);
    await waitFor(() => expect(screen.getByTestId('profile-load-error')).toBeTruthy());
    expect(screen.queryByTestId('driver-verification-banner')).toBeNull();
  });
});
