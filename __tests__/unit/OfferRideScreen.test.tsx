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
jest.mock('../../services/routes', () => ({
  computeRouteDistance: (...args: unknown[]) => mockComputeDistance(...args),
}));
jest.mock('../../utils/currency', () => ({
  formatCurrency: (n: number, c: string) => `${c === 'EUR' ? '€' : '£'}${n.toFixed(2)}`,
}));

// RouteInput mock — no type annotations in factory (Jest hoisting rule)
jest.mock('../../components/RouteInput', () => {
  const { View, TextInput } = require('react-native');
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
      </View>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockProfile.mockResolvedValue({ data: { tax_residence: 'ROI', engine_cc: 'le1200' }, error: null });
  mockIncrements.mockResolvedValue({ data: [], error: null });
  mockComputeDistance.mockResolvedValue({ ok: true, distance: 210, unit: 'km' });
});

import OfferRideScreen from '../../app/offer-ride';

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
});
