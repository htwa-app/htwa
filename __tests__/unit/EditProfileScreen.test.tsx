/**
 * __tests__/unit/EditProfileScreen.test.tsx
 *
 * Stage 22 — unit tests for app/edit-profile.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

// Supabase — mutable impls
const mockSingleImpl = jest.fn();
const mockUpsertImpl = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: (...a: unknown[]) => mockSingleImpl(...a) }) }),
      upsert: (...a: unknown[]) => mockUpsertImpl(...a),
    }),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
  mockSingleImpl.mockResolvedValue({
    data: { bio: 'Road tripper', university: 'UCD', travel_preferences: { chatty: true } },
    error: null,
  });
  mockUpsertImpl.mockResolvedValue({ error: null });
});

import EditProfileScreen from '../../app/edit-profile';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('EditProfileScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<EditProfileScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('edit-profile-screen')).toBeTruthy());
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('EditProfileScreen — loading', () => {
  it('shows loading indicator initially', () => {
    mockSingleImpl.mockReturnValue(new Promise(() => {}));
    render(<EditProfileScreen />);
    expect(screen.getByTestId('edit-profile-loading')).toBeTruthy();
  });
});

// ─── Pre-fill from Supabase ───────────────────────────────────────────────────

describe('EditProfileScreen — pre-fill', () => {
  it('pre-fills bio from profile data', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('bio-input')).toBeTruthy());
    expect(screen.getByDisplayValue('Road tripper')).toBeTruthy();
  });

  it('pre-fills university from profile data', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('university-input')).toBeTruthy());
    expect(screen.getByDisplayValue('UCD')).toBeTruthy();
  });
});

// ─── Travel preference chips ──────────────────────────────────────────────────

describe('EditProfileScreen — preference chips', () => {
  it('renders all four preference chips', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('prefs-grid')).toBeTruthy());
    expect(screen.getByTestId('pref-chatty')).toBeTruthy();
    expect(screen.getByTestId('pref-musicOk')).toBeTruthy();
    expect(screen.getByTestId('pref-noSmoking')).toBeTruthy();
    expect(screen.getByTestId('pref-petsOk')).toBeTruthy();
  });

  it('toggles a preference chip when pressed', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('pref-musicOk')).toBeTruthy());
    const chip = screen.getByTestId('pref-musicOk');
    // musicOk starts false — press once to enable
    fireEvent.press(chip);
    expect(chip.props.accessibilityState?.selected).toBe(true);
  });
});

// ─── Save ─────────────────────────────────────────────────────────────────────

describe('EditProfileScreen — save', () => {
  it('calls supabase upsert with correct payload on save', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('save-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(mockUpsertImpl).toHaveBeenCalled());
    const [payload, opts] = mockUpsertImpl.mock.calls[0];
    expect(payload.user_id).toBe('user-123');
    expect(opts).toEqual({ onConflict: 'user_id' });
  });

  it('navigates back after successful save', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('save-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('shows error message when save fails', async () => {
    mockUpsertImpl.mockResolvedValue({ error: { message: 'DB error' } });
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('save-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(screen.getByTestId('save-error')).toBeTruthy());
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('EditProfileScreen — navigation', () => {
  it('calls router.back() when back button is pressed', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
