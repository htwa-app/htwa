/**
 * __tests__/unit/MyRidesScreen.test.tsx
 * Stage 38 — unit tests for app/my-rides.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: mockPush }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

jest.mock('../../utils/currency', () => ({
  formatCurrency: (n: number, c: string) => `${c === 'EUR' ? '€' : '£'}${n.toFixed(2)}`,
}));

// Mock future departure for upcoming + past in past
const FUTURE = new Date(Date.now() + 86400000 * 7).toISOString();
const PAST   = new Date(Date.now() - 86400000 * 7).toISOString();

let mockDriverRides: unknown[] = [];
let mockBookings:    unknown[] = [];

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'rides') {
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: mockDriverRides, error: null }) }),
          }),
        };
      }
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: mockBookings, error: null }) }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
    },
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockDriverRides = [];
  mockBookings    = [];
});

import MyRidesScreen from '../../app/my-rides';

describe('MyRidesScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<MyRidesScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('my-rides-screen')).toBeTruthy());
  });
});

describe('MyRidesScreen — empty states', () => {
  it('shows no upcoming rides message when empty', async () => {
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('upcoming-empty')).toBeTruthy());
  });

  it('shows no past rides message when empty', async () => {
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('past-empty')).toBeTruthy());
  });
});

describe('MyRidesScreen — with rides', () => {
  it('shows driver ride card', async () => {
    mockDriverRides = [{
      id: 'ride-1', from_location: 'Dublin', to_location: 'Cork',
      departure_datetime: FUTURE, cost_per_seat: 12.50, currency: 'EUR', status: 'active',
    }];
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-item-ride-1')).toBeTruthy());
  });

  it('shows passenger booking card', async () => {
    mockBookings = [{
      id: 'booking-1', status: 'confirmed',
      ride: { id: 'ride-2', from_location: 'Galway', to_location: 'Dublin', departure_datetime: FUTURE, cost_per_seat: 8, currency: 'EUR', status: 'active' },
    }];
    render(<MyRidesScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-item-ride-2')).toBeTruthy());
  });

  it('separates upcoming and past rides correctly', async () => {
    mockDriverRides = [
      { id: 'future-ride', from_location: 'Dublin', to_location: 'Cork', departure_datetime: FUTURE, cost_per_seat: 10, currency: 'EUR', status: 'active' },
      { id: 'past-ride',   from_location: 'Cork', to_location: 'Dublin', departure_datetime: PAST,   cost_per_seat: 10, currency: 'EUR', status: 'completed' },
    ];
    render(<MyRidesScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('ride-item-future-ride')).toBeTruthy();
      expect(screen.getByTestId('ride-item-past-ride')).toBeTruthy();
    });
  });
});
