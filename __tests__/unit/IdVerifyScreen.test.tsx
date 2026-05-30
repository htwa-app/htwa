/**
 * __tests__/unit/IdVerifyScreen.test.tsx
 *
 * Unit tests for app/id-verify.tsx (Stage 20C / beta placeholder).
 *
 * Stripe Identity is deferred to Phase 15. The screen now writes the
 * verification row directly on button press (beta flow).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import IdVerifyScreen from '../../app/id-verify';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockRefreshVerification = jest.fn();
const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUpsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ upsert: (...args: unknown[]) => mockUpsert(...args) }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: logged-in user
  mockUseAuth.mockReturnValue({
    user:                { id: 'user-123' },
    isLoading:           false,
    refreshVerification: mockRefreshVerification,
  });
  // Default: upsert succeeds
  mockUpsert.mockResolvedValue({ error: null });
  mockRefreshVerification.mockResolvedValue(undefined);
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<IdVerifyScreen />)).not.toThrow();
  });
});

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — layout', () => {
  beforeEach(() => render(<IdVerifyScreen />));

  it('renders the screen title', () => {
    expect(screen.getByText('Verify your identity')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    expect(screen.getByText(/one-time step/i)).toBeTruthy();
  });

  it('renders the Start verification button', () => {
    expect(screen.getByRole('button', { name: 'Start verification' })).toBeTruthy();
  });

  it('does not show a message on initial render', () => {
    expect(screen.queryByTestId('id-verify-message')).toBeNull();
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('IdVerifyScreen — auth guard', () => {
  it('redirects to /login when user is null and loading is false', async () => {
    mockUseAuth.mockReturnValue({
      user: null, isLoading: false, refreshVerification: mockRefreshVerification,
    });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('does not redirect while auth is still loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, isLoading: true, refreshVerification: mockRefreshVerification,
    });
    render(<IdVerifyScreen />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — success', () => {
  it('navigates to /profile-setup on successful verification', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/profile-setup'));
  });

  it('upserts verification status to Supabase on press', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1));
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:         'user-123',
        id_verified:     true,
        selfie_verified: true,
      }),
      { onConflict: 'user_id' },
    );
  });

  it('calls refreshVerification after upsert', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/profile-setup'));
    expect(mockRefreshVerification).toHaveBeenCalled();
  });
});

// ─── Error ────────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — error', () => {
  it('shows an error message when upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Database error' } });
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));
    await waitFor(() =>
      expect(screen.getByTestId('id-verify-message')).toBeTruthy(),
    );
    expect(screen.getByText('Database error')).toBeTruthy();
  });

  it('does not navigate when upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Database error' } });
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));
    await waitFor(() =>
      expect(screen.getByTestId('id-verify-message')).toBeTruthy(),
    );
    expect(mockReplace).not.toHaveBeenCalledWith('/profile-setup');
  });
});
