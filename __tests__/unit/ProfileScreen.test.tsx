/**
 * __tests__/unit/ProfileScreen.test.tsx
 *
 * Stage 21 — unit tests for app/(tabs)/profile.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: (props: Record<string, unknown>) => (
      <View testID={`icon-${props.name}`} />
    ),
  };
});

// Supabase mock — mockSingleImpl is mutated per-test
const mockSingleImpl = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: (...args: unknown[]) => mockSingleImpl(...args),
        }),
      }),
    }),
  },
}));

// Auth context mock
const mockUseAuth = jest.fn();
jest.mock('../../services/reviews', () => ({
  getReviewSummary: jest.fn().mockResolvedValue({ ok: true, summary: { average: 4.5, count: 3, reviews: [] } }),
  getCompletedTripsCount: jest.fn().mockResolvedValue({ ok: true, count: 7 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const DEFAULT_USER = {
  id: 'user-123',
  user_metadata: { full_name: 'Jordan Madden' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: DEFAULT_USER,
    isVerified: true,
  });
  mockSingleImpl.mockResolvedValue({
    data: {
      university: 'UCD',
      bio: 'Love road trips',
      travel_preferences: {},
      women_only_mode: false,
    },
    error: null,
  });
});

import ProfileScreen from '../../app/(tabs)/profile';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('ProfileScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<ProfileScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('profile-screen')).toBeTruthy());
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('ProfileScreen — loading state', () => {
  it('shows a loading indicator while fetching', () => {
    mockSingleImpl.mockReturnValue(new Promise(() => {}));
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-loading')).toBeTruthy();
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('ProfileScreen — error state', () => {
  it('shows error state when Supabase returns a non-404 error', async () => {
    mockSingleImpl.mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'Server error' },
    });
    render(<ProfileScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('profile-error')).toBeTruthy(),
    );
  });

  it('shows a try again button in the error state', async () => {
    mockSingleImpl.mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'Server error' },
    });
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
  });
});

// ─── Profile data rendering ───────────────────────────────────────────────────

describe('ProfileScreen — profile data', () => {
  it('displays the user full name', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('profile-name')).toBeTruthy());
    expect(screen.getByText('Jordan Madden')).toBeTruthy();
  });

  it('displays the university', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('UCD')).toBeTruthy());
  });

  it('displays the bio when present', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByText('Love road trips')).toBeTruthy());
  });

  it('does not render bio card when bio is null', async () => {
    mockSingleImpl.mockResolvedValue({
      data: { university: 'UCD', bio: null, travel_preferences: {}, women_only_mode: false },
      error: null,
    });
    render(<ProfileScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('profile-screen')).toBeTruthy(),
    );
    expect(screen.queryByTestId('profile-bio')).toBeNull();
  });
});

// ─── Badges ───────────────────────────────────────────────────────────────────

describe('ProfileScreen — badges', () => {
  it('shows the verified badge when isVerified is true', async () => {
    render(<ProfileScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('verified-badge')).toBeTruthy(),
    );
  });

  it('does not show verified badge when isVerified is false', async () => {
    mockUseAuth.mockReturnValue({ user: DEFAULT_USER, isVerified: false });
    render(<ProfileScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('profile-screen')).toBeTruthy(),
    );
    expect(screen.queryByTestId('verified-badge')).toBeNull();
  });
});

// ─── Stats row ────────────────────────────────────────────────────────────────

describe('ProfileScreen — stats row', () => {
  it('renders all three stat items', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('stat-rating')).toBeTruthy());
    expect(screen.getByTestId('stat-trips')).toBeTruthy();
    expect(screen.getByTestId('stat-reviews-count')).toBeTruthy();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('ProfileScreen — navigation', () => {
  it('navigates to /settings when cog is pressed', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('settings-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('settings-button'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('navigates to /edit-profile when edit button is pressed', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('edit-profile-button'));
    expect(mockPush).toHaveBeenCalledWith('/edit-profile');
  });

  it('navigates to /my-rides when my rides button is pressed', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('my-rides-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('my-rides-button'));
    expect(mockPush).toHaveBeenCalledWith('/my-rides');
  });

  it('navigates to /vehicle-details when vehicle details button is pressed', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('vehicle-details-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('vehicle-details-button'));
    expect(mockPush).toHaveBeenCalledWith('/vehicle-details');
  });
});

// ─── No-user guard ────────────────────────────────────────────────────────────

describe('ProfileScreen — no user', () => {
  it('renders without crashing when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, isVerified: false });
    expect(() => render(<ProfileScreen />)).not.toThrow();
  });
});
