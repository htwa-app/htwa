/**
 * __tests__/unit/RideDetailScreen.test.tsx
 * Stage 35 — unit tests for app/ride/[id].tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'r1' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});
jest.mock('../../components/RouteMapPlaceholder', () => {
  const { View } = require('react-native');
  return { RouteMapPlaceholder: () => <View testID="route-map-placeholder" /> };
});

const mockRide   = jest.fn();
const mockUser   = jest.fn();
const mockProfile = jest.fn();
const mockVerif  = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => mockRide(),
          maybeSingle: () => {
            if (table === 'users')        return mockUser();
            if (table === 'profiles')     return mockProfile();
            if (table === 'verification') return mockVerif();
            return Promise.resolve({ data: null });
          },
        }),
      }),
    }),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import RideDetailScreen from '../../app/ride/[id]';

const RIDE = {
  id: 'r1', driver_id: 'd1', from_location: 'Galway', to_location: 'Dublin',
  departure_datetime: '2026-06-01T09:00:00Z', seats_available: 3, seats_total: 4,
  cost_per_seat: 12, currency: 'EUR', distance_km: 200, women_only: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockRide.mockResolvedValue({ data: RIDE, error: null });
  mockUser.mockResolvedValue({ data: { full_name: 'Aoife Murphy' }, error: null });
  mockProfile.mockResolvedValue({ data: { university: 'NUIG', vehicle_details: { make: 'Toyota', model: 'Yaris', seats: 4, hasAC: true, dashcam: false } }, error: null });
  mockVerif.mockResolvedValue({ data: { id_verified: true, selfie_verified: true }, error: null });
});

describe('RideDetailScreen', () => {
  it('shows a loading state initially', () => {
    mockRide.mockReturnValue(new Promise(() => {}));
    render(<RideDetailScreen />);
    expect(screen.getByTestId('ride-detail-loading')).toBeTruthy();
  });

  it('renders the driver and route once loaded', async () => {
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('driver-name')).toHaveTextContent('Aoife Murphy'));
    expect(screen.getByTestId('ride-from')).toHaveTextContent('Galway');
    expect(screen.getByTestId('ride-to')).toHaveTextContent('Dublin');
    expect(screen.getByTestId('driver-verified')).toBeTruthy();
  });

  it('increments the seat selector up to availability and navigates to booking', async () => {
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('book-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('seats-inc'));
    expect(screen.getByTestId('seats-wanted')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('book-button'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/booking-request?rideId=r1'));
  });

  it('shows the error state when the ride is not found', async () => {
    mockRide.mockResolvedValue({ data: null, error: { message: 'nope' } });
    render(<RideDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('ride-detail-error')).toBeTruthy());
  });
});
