/**
 * __tests__/unit/RateTripScreen.test.tsx
 * Stage 54/55 — unit tests for app/rate-trip/[booking_id].tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ booking_id: 'bk1' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockBookingResult = jest.fn();
const mockRideResult = jest.fn();
const mockUpsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => (table === 'bookings' ? mockBookingResult() : Promise.resolve({ data: null, error: null })),
          maybeSingle: () => (table === 'rides' ? mockRideResult() : Promise.resolve({ data: null, error: null })),
        }),
      }),
      upsert: (payload: unknown, opts?: unknown) => mockUpsert(payload, opts),
    }),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import RateTripScreen from '../../app/rate-trip/[booking_id]';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } }); // u1 is the passenger
  mockBookingResult.mockResolvedValue({ data: { ride_id: 'r1', passenger_id: 'u1' }, error: null });
  mockRideResult.mockResolvedValue({ data: { driver_id: 'd1' }, error: null });
  mockUpsert.mockResolvedValue({ error: null });
});

describe('RateTripScreen', () => {
  it('renders five stars and a comment field', () => {
    render(<RateTripScreen />);
    expect(screen.getByTestId('star-1')).toBeTruthy();
    expect(screen.getByTestId('star-5')).toBeTruthy();
    expect(screen.getByTestId('comment-input')).toBeTruthy();
  });

  it('disables submit until a rating is chosen', () => {
    render(<RateTripScreen />);
    expect(screen.getByTestId('submit-button').props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('star-4'));
    expect(screen.getByTestId('submit-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('upserts the review (reviewer reviews the driver) and navigates to history', async () => {
    render(<RateTripScreen />);
    fireEvent.press(screen.getByTestId('star-5'));
    fireEvent.changeText(screen.getByTestId('comment-input'), 'Great driver');
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const [payload, opts] = mockUpsert.mock.calls[0];
    expect(payload).toMatchObject({ trip_id: 'r1', reviewer_id: 'u1', reviewee_id: 'd1', rating: 5, comment: 'Great driver' });
    expect(opts).toEqual({ onConflict: 'trip_id,reviewer_id,reviewee_id' });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/history'));
  });

  it('shows an error when the upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } });
    render(<RateTripScreen />);
    fireEvent.press(screen.getByTestId('star-3'));
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => expect(screen.getByTestId('review-error')).toHaveTextContent('DB error'));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
