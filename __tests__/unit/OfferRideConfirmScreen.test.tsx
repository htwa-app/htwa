/**
 * __tests__/unit/OfferRideConfirmScreen.test.tsx
 * Stage 32 — unit tests for app/offer-ride-confirm.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockInsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }) },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import OfferRideConfirmScreen from '../../app/offer-ride-confirm';

const BASE_PARAMS = {
  from: 'Galway', to: 'Dublin', date: '2026-06-01', time: '09:00',
  seats: '3', pricePerSeat: '10.75', currency: 'EUR', distanceKm: '208', womenOnly: 'false',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { ...BASE_PARAMS };
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockInsert.mockResolvedValue({ error: null });
});

describe('OfferRideConfirmScreen', () => {
  it('renders the route and journey summary', () => {
    render(<OfferRideConfirmScreen />);
    expect(screen.getByTestId('confirm-from')).toHaveTextContent('Galway');
    expect(screen.getByTestId('confirm-to')).toHaveTextContent('Dublin');
    expect(screen.getByTestId('confirm-seats')).toHaveTextContent('3 seats available');
  });

  it('shows the legal cost-cap note', () => {
    render(<OfferRideConfirmScreen />);
    expect(screen.getByTestId('legal-note')).toBeTruthy();
  });

  it('shows the women-only badge only when women-only is true', () => {
    render(<OfferRideConfirmScreen />);
    expect(screen.queryByTestId('women-only-badge')).toBeNull();
    mockParams = { ...BASE_PARAMS, womenOnly: 'true' };
    render(<OfferRideConfirmScreen />);
    expect(screen.getAllByTestId('women-only-badge').length).toBeGreaterThan(0);
  });

  it('inserts the ride with the correct payload and navigates on success', async () => {
    render(<OfferRideConfirmScreen />);
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const payload = mockInsert.mock.calls[0][0];
    expect(payload).toMatchObject({
      driver_id: 'u1',
      from_location: 'Galway',
      to_location: 'Dublin',
      seats_total: 3,
      seats_available: 3,
      cost_per_seat: 10.75,
      currency: 'EUR',
      women_only: false,
      status: 'active',
    });
    expect(payload.departure_datetime).toBe('2026-06-01T09:00:00');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ride-posted'));
  });

  it('shows an error and does not navigate when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB down' } });
    render(<OfferRideConfirmScreen />);
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(screen.getByTestId('post-error')).toHaveTextContent('DB down'));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
