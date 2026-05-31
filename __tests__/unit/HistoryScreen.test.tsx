/**
 * __tests__/unit/HistoryScreen.test.tsx
 * Stage 61 — unit tests for app/(tabs)/history.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

interface MockDriverRide {
  id: string; from_location: string; to_location: string; departure_datetime: string;
  cost_per_seat: number; currency: 'EUR' | 'GBP'; status: string;
}
interface MockBooking {
  id: string; status: string;
  ride: { id: string; from_location: string; to_location: string; departure_datetime: string; cost_per_seat: number; currency: 'EUR' | 'GBP'; status: string; driver: { full_name: string } };
}

const mockRides = jest.fn();
const mockBookings = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ order: () => (table === 'rides' ? mockRides() : mockBookings()) }) }),
    }),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import HistoryScreen from '../../app/(tabs)/history';

const driverRides: MockDriverRide[] = [
  { id: 'r1', from_location: 'Cork', to_location: 'Limerick', departure_datetime: '2026-05-01T09:00:00Z', cost_per_seat: 6, currency: 'EUR', status: 'completed' },
];
const bookings: MockBooking[] = [
  { id: 'b1', status: 'completed', ride: { id: 'r2', from_location: 'Galway', to_location: 'Dublin', departure_datetime: '2026-05-02T09:00:00Z', cost_per_seat: 5, currency: 'EUR', status: 'completed', driver: { full_name: 'Aoife' } } },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockRides.mockResolvedValue({ data: driverRides, error: null });
  mockBookings.mockResolvedValue({ data: bookings, error: null });
});

describe('HistoryScreen', () => {
  it('renders the stats header and filter tabs', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('stats-header')).toBeTruthy());
    expect(screen.getByTestId('filter-tabs')).toBeTruthy();
  });

  it('shows the savings vs public transport on a completed passenger trip', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('savings-r2')).toBeTruthy());
    // Galway→Dublin fare 13, paid 5 → saved 8
    expect(screen.getByTestId('savings-r2')).toHaveTextContent(/8\.00/);
  });

  it('filters to driver trips only', async () => {
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('trip-item-r1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('filter-driver'));
    expect(screen.getByTestId('trip-item-r1')).toBeTruthy();   // driver ride stays
    expect(screen.queryByTestId('trip-item-r2')).toBeNull();   // passenger trip filtered out
  });

  it('shows an error state when a query errors', async () => {
    mockRides.mockResolvedValue({ data: null, error: { message: 'boom' } });
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('history-error')).toBeTruthy());
  });

  it('shows the empty state when there are no trips', async () => {
    mockRides.mockResolvedValue({ data: [], error: null });
    mockBookings.mockResolvedValue({ data: [], error: null });
    render(<HistoryScreen />);
    await waitFor(() => expect(screen.getByTestId('history-empty')).toBeTruthy());
  });
});
