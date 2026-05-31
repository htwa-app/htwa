/**
 * __tests__/unit/user-profile/[id].test.tsx
 *
 * Stage 24 — unit tests for app/user-profile/[id].tsx
 *
 * Three parallel queries are fired via Promise.all. We route per table name.
 * All mutable state variables must be prefixed with "mock" for Jest hoisting.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'other-user-456' }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

// All mutable vars must start with "mock" for Jest hoisting to allow factory access
let mockUserRow:    Record<string, unknown> | null = { full_name: 'Aoife Murphy' };
let mockProfileRow: Record<string, unknown> | null = { university: 'TCD', women_only_mode: false };
let mockVerifyRow:  Record<string, unknown> | null = { id_verified: true, selfie_verified: true };
let mockIsPending = false;

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => {
            if (mockIsPending) return new Promise(() => {});
            if (table === 'users')
              return Promise.resolve({ data: mockUserRow, error: mockUserRow ? null : { code: 'PGRST116' } });
            if (table === 'profiles')
              return Promise.resolve({ data: mockProfileRow, error: null });
            if (table === 'verification')
              return Promise.resolve({ data: mockVerifyRow, error: null });
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPending   = false;
  mockUserRow     = { full_name: 'Aoife Murphy' };
  mockProfileRow  = { university: 'TCD', women_only_mode: false };
  mockVerifyRow   = { id_verified: true, selfie_verified: true };
});

import UserProfileScreen from '../../../app/user-profile/[id]';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('UserProfileScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<UserProfileScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('user-profile-screen')).toBeTruthy());
  });
});

// ─── Loading ──────────────────────────────────────────────────────────────────

describe('UserProfileScreen — loading', () => {
  it('shows loading indicator initially', () => {
    mockIsPending = true;
    render(<UserProfileScreen />);
    expect(screen.getByTestId('user-profile-loading')).toBeTruthy();
  });
});

// ─── Data rendering ───────────────────────────────────────────────────────────

describe('UserProfileScreen — data', () => {
  it('displays the user name', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByText('Aoife Murphy')).toBeTruthy());
  });

  it('displays the university', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByText('TCD')).toBeTruthy());
  });

  it('shows verified badge when user is verified', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('verified-badge')).toBeTruthy());
  });

  it('does not show verified badge when user is not verified', async () => {
    mockVerifyRow = { id_verified: false, selfie_verified: false };
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('user-profile-screen')).toBeTruthy());
    expect(screen.queryByTestId('verified-badge')).toBeNull();
  });

  it('shows women-only badge when womenOnly is true', async () => {
    mockUserRow    = { full_name: 'Siobhan Kelly' };
    mockProfileRow = { university: 'UCC', women_only_mode: true };
    mockVerifyRow  = { id_verified: true, selfie_verified: true };
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('women-only-badge')).toBeTruthy());
  });
});

// ─── Stats ────────────────────────────────────────────────────────────────────

describe('UserProfileScreen — stats', () => {
  it('renders all three stat items', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('stat-rating')).toBeTruthy());
    expect(screen.getByTestId('stat-trips')).toBeTruthy();
    expect(screen.getByTestId('stat-reliability')).toBeTruthy();
  });
});

// ─── Reviews placeholder ──────────────────────────────────────────────────────

describe('UserProfileScreen — reviews', () => {
  it('renders the reviews section placeholder', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('reviews-section')).toBeTruthy());
  });
});

// ─── Report modal ─────────────────────────────────────────────────────────────

describe('UserProfileScreen — report', () => {
  it('shows report button', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('report-button')).toBeTruthy());
  });

  it('opens report modal when report button is pressed', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('report-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('report-button'));
    await waitFor(() => expect(screen.getByTestId('report-modal-close')).toBeTruthy());
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('UserProfileScreen — navigation', () => {
  it('calls router.back() when back button is pressed', async () => {
    render(<UserProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
