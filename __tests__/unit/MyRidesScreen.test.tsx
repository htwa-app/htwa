/**
 * __tests__/unit/MyRidesScreen.test.tsx
 * Stage 38 — unit tests for app/my-rides.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

// Typed mock rows (no unknown[]).
interface MockDriverRide {
  id: string; from_location: string; to_location: string;
  departure_datetime: string; cost_per_seat: number; currency: 'EUR' | 'GBP'; status: string;
}
interface MockBooking {
  id: string; status: string;
  ride: { id: string; from_location: string; to_location: string; departure_datetime: string; cost_per_seat: number; currency: 'EUR' | 'GBP'; status: string };
}

const FUTURE = '2099-06-01T09:00:00Z';
const PAST   = '2020-01-01T09:00:00Z';

const mockRidesResult    = jest.fn();
const mockBookingsResult = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () =>
            table === 'rides' ? mockRidesResult() : mockBookingsResult(),
        }),
      }),
    }),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import MyRidesScreen from '../../app/my-rides';

const driverRides: MockDriverRide[] = [
  { id: 'r1', from_location: 'Galway', to_location: 'Dublin', departure_datetime: FUTURE, cost_per_seat: 12, currency: 'EUR', status: 'active' },
  { id: 'r2', from_location: 'Cork', to_location: 'Limerick', departure_datetime: PAST, cost_per_seat: 8, currency: 'EUR', status: 'completed' },
];
const bookings: MockBooking[] = [
  { id: 'b1', status: 'confirmed', ride: { id: 'r3', from_location: 'Sligo', to_location: 'Dublin', departure_datetime: FUTURE, cost_per_seat: 15, currency: 'EUR', status: 'active' } },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockRidesResult.mockResolvedValue({ data: driverRides, error: null });
  mockBookingsResult.mockResolvedValue({ data: bookings, error: null });
});

describe('MyRidesScreen', () => {
  it('renders the screen with upcoming and past sections', async () => {
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('my-rides-screen')).toBeTruthy());
    expect(screen.getByText('Upcoming')).toBeTruthy();
    expect(screen.getByText('Past')).toBeTruthy();
  });

  it('shows a driver ride and a passenger booking', async () => {
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-item-r1')).toBeTruthy());
    expect(screen.getByTestId('ride-item-r3')).toBeTruthy(); // passenger booking's ride
    expect(screen.getByTestId('ride-item-r2')).toBeTruthy(); // past driver ride
  });

  it('navigates to the ride detail when a card is pressed', async () => {
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-item-r1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('ride-item-r1'));
    expect(mockPush).toHaveBeenCalledWith('/ride/r1');
  });

  it('shows empty states when there are no rides', async () => {
    mockRidesResult.mockResolvedValue({ data: [], error: null });
    mockBookingsResult.mockResolvedValue({ data: [], error: null });
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('upcoming-empty')).toBeTruthy());
    expect(screen.getByTestId('past-empty')).toBeTruthy();
  });

  it('shows an error state when a query rejects', async () => {
    mockRidesResult.mockRejectedValue(new Error('network'));
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('rides-error')).toBeTruthy());
  });

  it('navigates back when the back button is pressed', async () => {
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
