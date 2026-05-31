/**
 * __tests__/unit/SearchResultsScreen.test.tsx
 * Stage 34 — unit tests for app/search-results.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockRidesResult = jest.fn();
const mockVerifsResult = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'verification') {
        return { select: () => ({ in: () => mockVerifsResult() }) };
      }
      // rides — chainable query that is also awaitable (thenable)
      const q: Record<string, unknown> = {};
      ['select', 'gte', 'lte', 'eq', 'ilike', 'order'].forEach((m) => { q[m] = () => q; });
      (q as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(mockRidesResult());
      return q;
    },
  },
}));

interface MockRideRow {
  id: string; from_location: string; to_location: string; departure_datetime: string;
  seats_available: number; cost_per_seat: number; currency: 'EUR' | 'GBP'; women_only: boolean; driver_id: string;
  driver: { full_name: string };
}

import SearchResultsScreen from '../../app/search-results';

const RIDES: MockRideRow[] = [
  {
    id: 'r1', from_location: 'Galway', to_location: 'Dublin', departure_datetime: '2026-06-01T09:00:00Z',
    seats_available: 3, cost_per_seat: 12, currency: 'EUR', women_only: false, driver_id: 'd1',
    driver: { full_name: 'Aoife Murphy' },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { from: 'Galway', to: 'Dublin', date: '', seats: '1', womenOnly: 'false' };
  mockRidesResult.mockResolvedValue({ data: RIDES, error: null });
  mockVerifsResult.mockResolvedValue({ data: [{ user_id: 'd1', id_verified: true, selfie_verified: true }], error: null });
});

describe('SearchResultsScreen', () => {
  it('renders a ride card for each result', async () => {
    render(<SearchResultsScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-card-r1')).toBeTruthy());
    expect(screen.getByTestId('verified-r1')).toBeTruthy();
  });

  it('navigates to ride detail when a card is pressed', async () => {
    render(<SearchResultsScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-card-r1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('ride-card-r1'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/ride/r1'));
  });

  it('shows the empty state when there are no rides', async () => {
    mockRidesResult.mockResolvedValue({ data: [], error: null });
    render(<SearchResultsScreen />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeTruthy());
  });

  it('handles a non-numeric seats param without crashing (NaN guard)', async () => {
    mockParams = { from: 'A', to: 'B', date: '', seats: 'abc', womenOnly: 'false' };
    expect(() => render(<SearchResultsScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('ride-card-r1')).toBeTruthy());
  });
});
