/**
 * __tests__/unit/LiveTripScreen.test.tsx
 * Stage 48 — unit tests for app/(tabs)/live-trip.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

// Mutable state — prefixed with mock for Jest hoisting
interface MockRide {
  id: string;
  from_location: string;
  to_location: string;
  status: string;
}
interface MockBooking { id: string; ride_id: string }
interface MockPassengerRide { id: string; from_location: string; to_location: string; driver_id: string }

let mockRideRow:       MockRide | null          = null;   // driver's active ride (.single on rides)
let mockBookingRow:    MockBooking | null       = null;   // passenger booking (.maybeSingle on bookings)
let mockPassengerRide: MockPassengerRide | null = null;   // ride for that booking (.maybeSingle on rides)
let mockDriverUser:    { full_name: string } | null = null;

jest.mock('../../lib/supabase', () => ({
  supabase: {
    // Flexible chainable builder. Terminal method + table determine the result.
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      ['select', 'eq', 'order', 'limit'].forEach((m) => { builder[m] = () => builder; });
      builder.single = () =>
        Promise.resolve(
          table === 'rides'
            ? { data: mockRideRow, error: mockRideRow ? null : { code: 'PGRST116' } }
            : { data: null, error: null },
        );
      builder.maybeSingle = () =>
        Promise.resolve(
          table === 'bookings' ? { data: mockBookingRow, error: null }
          : table === 'rides'  ? { data: mockPassengerRide, error: null }
          : table === 'users'  ? { data: mockDriverUser, error: null }
          : { data: null, error: null },
        );
      return builder;
    },
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockRideRow       = null;
  mockBookingRow    = null;
  mockPassengerRide = null;
  mockDriverUser    = null;
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
});

import LiveTripScreen from '../../app/(tabs)/live-trip';

describe('LiveTripScreen — idle state', () => {
  it('shows idle state when no active trip', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('idle-state')).toBeTruthy());
  });

  it('shows the correct idle message', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByText('No active journey')).toBeTruthy());
  });
});

describe('LiveTripScreen — active trip', () => {
  beforeEach(() => {
    mockRideRow = { id: 'ride-1', from_location: 'Dublin', to_location: 'Galway', status: 'active' } satisfies MockRide;
  });

  it('shows the trip bottom sheet', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-bottom-sheet')).toBeTruthy());
  });

  it('shows the LIVE badge', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('live-badge')).toBeTruthy());
  });

  it('shows the sharing panel', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('sharing-panel')).toBeTruthy());
  });

  it('shows the Silent SOS button', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('sos-button')).toBeTruthy());
  });

  it('SOS button can be pressed without crashing', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('sos-button')).toBeTruthy());
    expect(() => fireEvent.press(screen.getByTestId('sos-button'))).not.toThrow();
  });

  it('shows from and to locations', async () => {
    render(<LiveTripScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-from')).toBeTruthy());
    expect(screen.getByTestId('trip-to')).toBeTruthy();
  });
});

describe('LiveTripScreen — no user', () => {
  it('renders without crashing when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });
    expect(() => render(<LiveTripScreen />)).not.toThrow();
  });
});
