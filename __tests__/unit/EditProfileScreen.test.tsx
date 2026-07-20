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

// Pickers + avatar service — native modules, mocked (their own logic is thin).
const mockPickStudentCard = jest.fn();
const mockPickProfilePhoto = jest.fn();
jest.mock('../../services/imagePicker', () => ({
  pickStudentCardImage: (...a: unknown[]) => mockPickStudentCard(...a),
  pickProfilePhoto: (...a: unknown[]) => mockPickProfilePhoto(...a),
}));
const mockUploadAvatar = jest.fn();
const mockGetAvatarUrl = jest.fn();
jest.mock('../../services/avatar', () => ({
  uploadAvatar: (...a: unknown[]) => mockUploadAvatar(...a),
  getAvatarUrl: (...a: unknown[]) => mockGetAvatarUrl(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
  mockSingleImpl.mockResolvedValue({
    data: { bio: 'Road tripper', university: 'UCD', travel_preferences: { chatty: true } },
    error: null,
  });
  mockUpsertImpl.mockResolvedValue({ error: null });
  mockPickStudentCard.mockResolvedValue(null);
  mockPickProfilePhoto.mockResolvedValue(null);
  mockUploadAvatar.mockResolvedValue({ ok: true, path: 'user-123/avatar-1.jpg' });
  mockGetAvatarUrl.mockResolvedValue(null);
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

  it('shows an error (not a silently blank form) when the initial load query errors', async () => {
    mockSingleImpl.mockResolvedValue({ data: null, error: { message: 'db down', code: '500' } });
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('save-error')).toHaveTextContent(/could not load/i));
  });

  it('does not show an error for a first-time profile (PGRST116 — no row yet)', async () => {
    mockSingleImpl.mockResolvedValue({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('edit-profile-screen')).toBeTruthy());
    expect(screen.queryByTestId('save-error')).toBeNull();
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

// ─── Block 6 — mandatory university + verification ──────────────────────────────

describe('EditProfileScreen — Block 6 university verification', () => {
  it('disables save and shows a hint when university is cleared', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('university-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('university-input'), '');
    expect(screen.getByTestId('university-required')).toBeTruthy();
    expect(screen.getByTestId('save-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('renders the student-card verification status', async () => {
    mockSingleImpl.mockResolvedValue({
      data: { bio: '', university: 'UCD', travel_preferences: {}, university_verification_status: 'pending' },
      error: null,
    });
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('uni-status')).toHaveTextContent('Pending review'));
  });

  it('shows the no-photo note when the picker returns nothing (cancel/denied)', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('upload-student-card')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upload-student-card'));
    await waitFor(() => expect(screen.getByTestId('upload-note')).toHaveTextContent(/no photo selected/i));
  });

  it('picks and uploads a profile photo, then shows it', async () => {
    mockPickProfilePhoto.mockResolvedValue(new Uint8Array([1]));
    mockGetAvatarUrl.mockResolvedValue('https://signed/avatar.jpg');
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-picker')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-picker'));
    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledWith('user-123', expect.any(Uint8Array)));
    await waitFor(() => expect(screen.getByTestId('profile-photo')).toBeTruthy());
  });

  it('a failed avatar upload shows an error, not a silent no-op', async () => {
    mockPickProfilePhoto.mockResolvedValue(new Uint8Array([1]));
    mockUploadAvatar.mockResolvedValue({ ok: false, message: 'denied' });
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-picker')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-picker'));
    await waitFor(() => expect(screen.getByTestId('avatar-error')).toBeTruthy());
  });

  it('centres the input text', async () => {
    render(<EditProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('university-input')).toBeTruthy());
    const input = screen.getByTestId('university-input');
    const flat = Array.isArray(input.props.style) ? Object.assign({}, ...input.props.style.flat()) : input.props.style;
    expect(flat.textAlign).toBe('center');
  });
});
