/**
 * __tests__/unit/TrackingScreen.test.tsx
 * Safety suite — tests for app/track/[token].tsx (nominated-contact live view).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockParams = { token: 'tok-1' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false }),
}));

const mockRpc = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: (...a: unknown[]) => mockRpc(...a) },
}));

import TrackingScreen from '../../app/track/[token]';

const TRIP = {
  status: 'in_progress',
  from_location: 'Dublin',
  to_location: 'Galway',
  from_coords: { lat: 53.3498, lng: -6.2603 },
  to_coords: { lat: 53.2707, lng: -9.0568 },
  departure_datetime: '2026-07-18T09:00:00Z',
  estimated_duration_seconds: 7200,
};

const liveSnapshot = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  trip: TRIP,
  traveller_name: 'Saoirse',
  driver_name: 'Aoife',
  contact_name: 'Mam',
  last_location: { lat: 53.42, lng: -7.94, recorded_at: new Date().toISOString() },
  alerts: [],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockRpc.mockResolvedValue({ data: liveSnapshot(), error: null });
});

afterEach(() => { jest.useRealTimers(); });

describe('TrackingScreen — live', () => {
  it('shows traveller, live status, progress and coordinates', async () => {
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByTestId('track-traveller')).toBeTruthy());
    expect(screen.getByText("Following Saoirse's journey")).toBeTruthy();
    expect(screen.getByText('On the road')).toBeTruthy();
    expect(screen.getByTestId('track-progress')).toBeTruthy();
    expect(screen.getByTestId('track-coords')).toBeTruthy();
    expect(screen.getByText('Driver: Aoife')).toBeTruthy();
  });

  it('polls the snapshot RPC with the route token', async () => {
    render(<TrackingScreen />);
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_tracking_snapshot', { p_token: 'tok-1' }));
  });

  it('renders the route map when trip coordinates are known', async () => {
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByTestId('track-map')).toBeTruthy());
  });
});

describe('TrackingScreen — signal lost', () => {
  it('shows last-seen time and position when the feed goes stale', async () => {
    mockRpc.mockResolvedValue({
      data: liveSnapshot({
        last_location: { lat: 53.42, lng: -7.94, recorded_at: new Date(Date.now() - 10 * 60_000).toISOString() },
      }),
      error: null,
    });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByTestId('track-last-seen')).toBeTruthy());
    expect(screen.getByText('Signal lost')).toBeTruthy();
  });

  it('handles a journey with no locations at all', async () => {
    mockRpc.mockResolvedValue({ data: liveSnapshot({ last_location: null }), error: null });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByTestId('track-no-signal')).toBeTruthy());
  });
});

describe('TrackingScreen — alerts', () => {
  it('shows the SOS banner with emergency guidance', async () => {
    mockRpc.mockResolvedValue({
      data: liveSnapshot({ alerts: [{ alert_type: 'sos', detail: null, created_at: new Date().toISOString() }] }),
      error: null,
    });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByTestId('track-alerts')).toBeTruthy());
    expect(screen.getByText(/call 112\/999/)).toBeTruthy();
  });

  it('shows the off-course banner', async () => {
    mockRpc.mockResolvedValue({
      data: liveSnapshot({ alerts: [{ alert_type: 'off_course', detail: null, created_at: new Date().toISOString() }] }),
      error: null,
    });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByText(/off its planned route/)).toBeTruthy());
  });
});

describe('TrackingScreen — terminal & error states', () => {
  it('completed journey', async () => {
    mockRpc.mockResolvedValue({ data: liveSnapshot({ trip: { ...TRIP, status: 'completed' } }), error: null });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByText('Journey completed')).toBeTruthy());
  });

  it('expired token', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, reason: 'expired' }, error: null });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByText('This tracking link has expired')).toBeTruthy());
  });

  it('invalid token', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, reason: 'invalid_token' }, error: null });
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByText('Invalid tracking link')).toBeTruthy());
  });

  it('RPC failure shows retry, and retry recovers', async () => {
    mockRpc.mockRejectedValueOnce(new Error('network'));
    render(<TrackingScreen />);
    await waitFor(() => expect(screen.getByTestId('track-retry')).toBeTruthy());

    mockRpc.mockResolvedValue({ data: liveSnapshot(), error: null });
    fireEvent.press(screen.getByTestId('track-retry'));
    await waitFor(() => expect(screen.getByTestId('track-traveller')).toBeTruthy());
  });
});
