/**
 * __tests__/unit/LiveTripScreen.test.tsx
 *
 * Safety-suite rewrite — tests for app/(tabs)/live-trip.tsx:
 * idle, load-error + retry, driver lifecycle (start/complete), SOS,
 * passenger live/signal-lost states, and nominated-contact watch cards.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, back: jest.fn(), canGoBack: () => false }),
}));

// Child panels are tested in their own suites — stub them here.
jest.mock('../../components/NominatedContactCard', () => {
  const { View } = require('react-native');
  return { NominatedContactCard: (p: { testID?: string }) => <View testID={p.testID ?? 'nominated-contact-card'} /> };
});
jest.mock('../../components/DriverVerifyPanel', () => {
  const { View } = require('react-native');
  return { DriverVerifyPanel: (p: { testID?: string }) => <View testID={p.testID ?? 'driver-verify-panel'} /> };
});

// Tracking service — mocked except the pure feed classifier.
const mockStartPublishing = jest.fn().mockResolvedValue(undefined);
const mockStopPublishing = jest.fn();
const mockSendSOS = jest.fn();
const mockRaiseAlert = jest.fn().mockResolvedValue({ ok: true, channels: ['realtime'] });
const mockGetLatestLocation = jest.fn().mockResolvedValue({ ok: true, snapshot: { state: 'signal_lost', last: null } });
let mockLocationCallback: ((row: unknown) => void) | null = null;
jest.mock('../../services/tracking', () => {
  const actual = jest.requireActual('../../services/tracking');
  return {
    classifyFeed: actual.classifyFeed,
    SIGNAL_LOST_AFTER_MS: actual.SIGNAL_LOST_AFTER_MS,
    startPublishing: (...a: unknown[]) => mockStartPublishing(...a),
    stopPublishing: (...a: unknown[]) => mockStopPublishing(...a),
    sendSOS: (...a: unknown[]) => mockSendSOS(...a),
    raiseAlert: (...a: unknown[]) => mockRaiseAlert(...a),
    getLatestLocation: (...a: unknown[]) => mockGetLatestLocation(...a),
    subscribeToLocations: (_rideId: string, cb: (row: unknown) => void) => {
      mockLocationCallback = cb;
      return () => { mockLocationCallback = null; };
    },
  };
});

// ─── Supabase mock: recorded-call dispatcher ─────────────────────────────────

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: { message: string } | null };
let mockHandler: (table: string, calls: Call[]) => Result;

function defaultHandler(_table: string, calls: Call[]): Result {
  const terminal = calls[calls.length - 1]?.method;
  return { data: terminal === 'maybeSingle' ? null : [], error: null };
}

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const calls: Call[] = [];
      const builder: Record<string, unknown> = {};
      ['select', 'eq', 'in', 'order', 'limit', 'update', 'insert', 'upsert'].forEach((m) => {
        builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder; };
      });
      builder.maybeSingle = () => {
        calls.push({ method: 'maybeSingle', args: [] });
        return Promise.resolve(mockHandler(table, calls));
      };
      builder.single = () => {
        calls.push({ method: 'single', args: [] });
        return Promise.resolve(mockHandler(table, calls));
      };
      builder.then = (resolve: (r: Result) => unknown) =>
        Promise.resolve(mockHandler(table, calls)).then(resolve);
      return builder;
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import LiveTripScreen from '../../app/(tabs)/live-trip';

const has = (calls: Call[], method: string, firstArg?: unknown) =>
  calls.some((c) => c.method === method && (firstArg === undefined || c.args[0] === firstArg));

const DRIVER_RIDE = {
  id: 'ride-1',
  from_location: 'Dublin',
  to_location: 'Galway',
  from_coords: { lat: 53.35, lng: -6.26 },
  to_coords: { lat: 53.27, lng: -9.05 },
  departure_datetime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  status: 'active',
};

/** Handler for a driver whose own ride exists; no watched journeys. */
function driverHandler(status: string): (table: string, calls: Call[]) => Result {
  return (table, calls) => {
    if (table === 'rides' && has(calls, 'eq', 'driver_id')) {
      return { data: [{ ...DRIVER_RIDE, status }], error: null };
    }
    if (table === 'rides' && has(calls, 'update')) {
      return { data: [{ id: 'ride-1' }], error: null };
    }
    return defaultHandler(table, calls);
  };
}

/** Handler for a passenger with a confirmed booking on an in-progress ride. */
function passengerHandler(): (table: string, calls: Call[]) => Result {
  return (table, calls) => {
    if (table === 'rides' && has(calls, 'eq', 'driver_id')) return { data: [], error: null };
    if (table === 'bookings') return { data: [{ id: 'b1', ride_id: 'ride-9' }], error: null };
    if (table === 'rides' && has(calls, 'in', 'id')) {
      return {
        data: [{ ...DRIVER_RIDE, id: 'ride-9', status: 'in_progress', driver_id: 'd1' }],
        error: null,
      };
    }
    if (table === 'users') return { data: { full_name: 'Aoife Driver' }, error: null };
    return defaultHandler(table, calls);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHandler = defaultHandler;
  mockLocationCallback = null;
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockSendSOS.mockResolvedValue({ ok: true, channels: ['realtime', 'sms'] });
});

describe('LiveTripScreen — idle & error states', () => {
  it('shows idle state when no active trip and no watched journeys', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('idle-state')).toBeTruthy());
    expect(screen.getByText('No active journey')).toBeTruthy();
  });

  it('a failed load shows an error state with retry, never idle', async () => {
    mockHandler = () => ({ data: null, error: { message: 'network down' } });
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('live-trip-retry')).toBeTruthy());
    expect(screen.queryByTestId('idle-state')).toBeNull();

    // Retry with a healthy backend recovers.
    mockHandler = defaultHandler;
    fireEvent.press(screen.getByTestId('live-trip-retry'));
    await waitFor(() => expect(screen.getByTestId('idle-state')).toBeTruthy());
  });

  it('renders without crashing when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });
    expect(() => render(<LiveTripScreen />)).not.toThrow();
  });
});

describe('LiveTripScreen — driver, before start', () => {
  beforeEach(() => { mockHandler = driverHandler('active'); });

  it('shows the start button (departure within the start window)', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('start-journey-button')).toBeTruthy());
  });

  it('does not show LIVE badge or SOS before the journey starts', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-bottom-sheet')).toBeTruthy());
    expect(screen.queryByTestId('live-badge')).toBeNull();
    expect(screen.queryByTestId('sos-button')).toBeNull();
  });

  it('does not start publishing before the journey starts', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-bottom-sheet')).toBeTruthy());
    expect(mockStartPublishing).not.toHaveBeenCalled();
  });

  it('shows the nominated contact card', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('nominated-contact-card')).toBeTruthy());
  });

  it('a zero-row start update surfaces an error instead of pretending success', async () => {
    mockHandler = (table, calls) => {
      if (table === 'rides' && has(calls, 'update')) return { data: [], error: null };
      return driverHandler('active')(table, calls);
    };
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('start-journey-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('start-journey-button'));
    await waitFor(() => expect(screen.getByTestId('lifecycle-error')).toBeTruthy());
  });
});

describe('LiveTripScreen — driver, in progress', () => {
  beforeEach(() => { mockHandler = driverHandler('in_progress'); });

  it('shows LIVE badge, complete button and SOS', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('live-badge')).toBeTruthy());
    expect(screen.getByTestId('complete-journey-button')).toBeTruthy();
    expect(screen.getByTestId('sos-button')).toBeTruthy();
  });

  it('starts location publishing', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(mockStartPublishing).toHaveBeenCalledWith('ride-1', expect.any(Function)));
  });

  it('SOS calls sendSOS and shows subtle confirmation', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('sos-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('sos-button'));
    await waitFor(() => expect(mockSendSOS).toHaveBeenCalledWith('ride-1', 'u1'));
    await waitFor(() => expect(screen.getByText('Contact alerted')).toBeTruthy());
  });

  it('failed SOS offers retry', async () => {
    mockSendSOS.mockResolvedValue({ ok: false, message: 'no' });
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('sos-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('sos-button'));
    await waitFor(() => expect(screen.getByText('Retry SOS')).toBeTruthy());
  });

  it('a sustained off-course sample raises an off_course alert', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(mockStartPublishing).toHaveBeenCalled());
    const onSample = mockStartPublishing.mock.calls[0][1] as (p: { lat: number; lng: number; heading: null; speedMps: null }) => void;
    // Far off the Dublin→Galway corridor (Belfast), repeatedly.
    for (let i = 0; i < 10; i++) onSample({ lat: 54.6, lng: -5.93, heading: null, speedMps: null });
    await waitFor(() => expect(mockRaiseAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'off_course', rideId: 'ride-1' }),
    ));
    // Exactly once, despite continued deviation.
    expect(mockRaiseAlert).toHaveBeenCalledTimes(1);
  });
});

describe('LiveTripScreen — passenger, in progress', () => {
  beforeEach(() => { mockHandler = passengerHandler(); });

  it('shows the driver name and the verify-driver panel', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-driver')).toBeTruthy());
    expect(screen.getByText('Aoife Driver')).toBeTruthy();
    expect(screen.getByTestId('driver-verify-panel')).toBeTruthy();
  });

  it('shows signal-lost until a live location arrives, then live coordinates', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('signal-lost')).toBeTruthy());

    // A realtime insert arrives.
    mockLocationCallback?.({
      id: 1, ride_id: 'ride-9', lat: 53.4, lng: -7.9,
      heading: null, speed_mps: null, recorded_at: new Date().toISOString(),
    });
    await waitFor(() => expect(screen.getByTestId('live-coords')).toBeTruthy());
  });

  it('has no driver lifecycle buttons', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-bottom-sheet')).toBeTruthy());
    expect(screen.queryByTestId('start-journey-button')).toBeNull();
    expect(screen.queryByTestId('complete-journey-button')).toBeNull();
  });
});

describe('LiveTripScreen — nominated contact watch cards', () => {
  it('lists journeys the user is the contact for and navigates to tracking', async () => {
    mockHandler = (table, calls) => {
      if (table === 'journey_contacts') {
        return { data: [{ tracking_token: 'tok-1', ride_id: 'ride-5', user_id: 'traveller-1', token_expires_at: null }], error: null };
      }
      if (table === 'rides' && has(calls, 'in', 'id')) {
        return { data: [{ id: 'ride-5', from_location: 'Cork', to_location: 'Limerick', status: 'in_progress' }], error: null };
      }
      if (table === 'users') return { data: [{ id: 'traveller-1', full_name: 'Saoirse' }], error: null };
      return defaultHandler(table, calls);
    };
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('watch-card-ride-5')).toBeTruthy());
    expect(screen.getByText("Saoirse's journey")).toBeTruthy();

    fireEvent.press(screen.getByTestId('watch-card-ride-5'));
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/track/[token]', params: { token: 'tok-1' } });
  });

  it('expired contact tokens are filtered out', async () => {
    mockHandler = (table, calls) => {
      if (table === 'journey_contacts') {
        return {
          data: [{ tracking_token: 'tok-old', ride_id: 'ride-5', user_id: 'traveller-1', token_expires_at: new Date(Date.now() - 1000).toISOString() }],
          error: null,
        };
      }
      return defaultHandler(table, calls);
    };
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('idle-state')).toBeTruthy());
  });
});
