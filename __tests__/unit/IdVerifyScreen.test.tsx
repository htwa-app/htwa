/**
 * __tests__/unit/IdVerifyScreen.test.tsx
 *
 * Unit tests for app/id-verify.tsx (Stage 18 implementation).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import IdVerifyScreen from '../../app/id-verify';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockPresentIdentityVerificationSheet = jest.fn();
jest.mock('@stripe/stripe-react-native', () => ({
  useStripe: () => ({
    presentIdentityVerificationSheet: mockPresentIdentityVerificationSheet,
  }),
  StripeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: successful verification (no error)
  mockPresentIdentityVerificationSheet.mockResolvedValue({ error: undefined });
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

    expect(mockPush).not.toHaveBeenCalled();
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

    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — success', () => {
  it('navigates to /profile-setup on successful verification', async () => {
    mockPresentIdentityVerificationSheet.mockResolvedValue({ error: undefined });

    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/profile-setup');
    });
  });

  it('calls presentIdentityVerificationSheet exactly once per press', async () => {
    render(<IdVerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start verification' }));

    await waitFor(() => {
      expect(mockPresentIdentityVerificationSheet).toHaveBeenCalledTimes(1);
    });
  });
});
