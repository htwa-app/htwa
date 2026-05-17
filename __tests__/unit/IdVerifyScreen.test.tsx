/**
 * __tests__/unit/IdVerifyScreen.test.tsx
 *
 * Unit tests for app/id-verify.tsx (Stage 20C).
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

const mockPresentIdentityVerificationSheet = jest.fn();
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    presentIdentityVerificationSheet: mockPresentIdentityVerificationSheet,
  }),
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
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
  // Default: successful verification (no error)
  mockPresentIdentityVerificationSheet.mockResolvedValue({ error: undefined });
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

// ─── Cancel ───────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — cancel', () => {
  it('shows the cancel info message when user cancels verification', async () => {
    mockPresentIdentityVerificationSheet.mockResolvedValue({
      error: { code: 'Canceled', message: 'User canceled' },
    });

    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(screen.getByTestId('id-verify-message')).toBeTruthy();
    });

    expect(screen.getByText('Verification is required to use htwa.')).toBeTruthy();
  });

  it('does not navigate when user cancels', async () => {
    mockPresentIdentityVerificationSheet.mockResolvedValue({
      error: { code: 'Canceled', message: 'User canceled' },
    });

    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(screen.getByTestId('id-verify-message')).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalledWith('/profile-setup');
  });
});

// ─── Error ────────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — error', () => {
  it('shows the error message when verification fails', async () => {
    mockPresentIdentityVerificationSheet.mockResolvedValue({
      error: { code: 'Failed', message: 'Network error' },
    });

    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(screen.getByTestId('id-verify-message')).toBeTruthy();
    });

    expect(screen.getByText('Network error')).toBeTruthy();
  });

  it('does not navigate when verification errors', async () => {
    mockPresentIdentityVerificationSheet.mockResolvedValue({
      error: { code: 'Failed', message: 'Network error' },
    });

    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(screen.getByTestId('id-verify-message')).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalledWith('/profile-setup');
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — success', () => {
  it('navigates to /profile-setup on successful verification', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/profile-setup');
    });
  });

  it('upserts verification status to Supabase on successful verification', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1));
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:         'user-123',
        id_verified:     true,
        selfie_verified: true,
      }),
    );
  });

  it('calls presentIdentityVerificationSheet exactly once per press', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(mockPresentIdentityVerificationSheet).toHaveBeenCalledTimes(1);
    });
  });
});
