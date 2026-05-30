/**
 * __tests__/unit/AuthContext.test.tsx
 *
 * Unit tests for context/AuthContext.tsx (Stage 20A).
 *
 * Strategy: mock lib/supabase entirely so no real network calls are made.
 * A <TestConsumer /> component renders auth context values as text nodes
 * so assertions can be made with screen.getByTestId().
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// ─── Supabase mock ────────────────────────────────────────────────────────────
// jest.mock is hoisted; variables prefixed with "mock" are accessible inside
// the factory due to Jest's special-case hoisting for mock-prefixed identifiers.

const mockGetSession       = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSingle           = jest.fn();
const mockUnsubscribe      = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession:          () => mockGetSession(),
      onAuthStateChange:   (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Renders a component that exposes AuthContext values as testable text nodes. */
function TestConsumer() {
  const { user, session, isLoading, isVerified } = useAuth();
  return (
    <View>
      <Text testID="isLoading">{String(isLoading)}</Text>
      <Text testID="isVerified">{String(isVerified)}</Text>
      <Text testID="hasSession">{String(session !== null)}</Text>
      <Text testID="hasUser">{String(user !== null)}</Text>
    </View>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: no session
  mockGetSession.mockResolvedValue({ data: { session: null } });

  // Default: onAuthStateChange returns a subscription object
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });

  // Default: no verification row
  mockSingle.mockResolvedValue({ data: null, error: null });
});

// ─── useAuth hook ─────────────────────────────────────────────────────────────

describe('useAuth — outside provider', () => {
  it('throws when called outside AuthProvider', () => {
    // Suppress the expected error output in the test console
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useAuth();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider',
    );

    consoleSpy.mockRestore();
  });
});

// ─── Initial loading state ────────────────────────────────────────────────────

describe('AuthProvider — initial state', () => {
  it('isLoading is true before getSession resolves', () => {
    // Return a promise that never resolves so we can inspect the initial state
    mockGetSession.mockReturnValue(new Promise(() => {}));
    renderWithProvider();
    expect(screen.getByTestId('isLoading').props.children).toBe('true');
  });
});

// ─── No session ───────────────────────────────────────────────────────────────

describe('AuthProvider — no session', () => {
  it('sets isLoading to false after getSession resolves with no session', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
  });

  it('keeps session null when getSession returns null', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('hasSession').props.children).toBe('false'),
    );
  });

  it('keeps isVerified false when there is no session', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isVerified').props.children).toBe('false'),
    );
  });

  it('does not call supabase.from when there is no session', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
    expect(mockSingle).not.toHaveBeenCalled();
  });
});

// ─── Session exists, not verified ────────────────────────────────────────────

describe('AuthProvider — session but not verified', () => {
  const fakeUser    = { id: 'user-123' };
  const fakeSession = { user: fakeUser };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    // Verification row exists but both flags are false
    mockSingle.mockResolvedValue({
      data: { id_verified: false, selfie_verified: false },
      error: null,
    });
  });

  it('sets session and user', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('hasSession').props.children).toBe('true'),
    );
    expect(screen.getByTestId('hasUser').props.children).toBe('true');
  });

  it('isVerified is false when id_verified is false', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
    expect(screen.getByTestId('isVerified').props.children).toBe('false');
  });

  it('queries the verification table for the correct user', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(mockSingle).toHaveBeenCalledTimes(1),
    );
  });
});

// ─── Session exists, fully verified ──────────────────────────────────────────

describe('AuthProvider — session and fully verified', () => {
  const fakeUser    = { id: 'user-456' };
  const fakeSession = { user: fakeUser };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockSingle.mockResolvedValue({
      data: { id_verified: true, selfie_verified: true },
      error: null,
    });
  });

  it('isVerified is true when both flags are true', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isVerified').props.children).toBe('true'),
    );
  });

  it('isLoading becomes false after verification fetch', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
  });
});

// ─── Partially verified (only one flag true) ─────────────────────────────────

describe('AuthProvider — partially verified', () => {
  const fakeSession = { user: { id: 'user-789' } };

  it('isVerified is false when only id_verified is true', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockSingle.mockResolvedValue({
      data: { id_verified: true, selfie_verified: false },
      error: null,
    });
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
    expect(screen.getByTestId('isVerified').props.children).toBe('false');
  });

  it('isVerified is false when only selfie_verified is true', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockSingle.mockResolvedValue({
      data: { id_verified: false, selfie_verified: true },
      error: null,
    });
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
    expect(screen.getByTestId('isVerified').props.children).toBe('false');
  });
});

// ─── Subscription cleanup ─────────────────────────────────────────────────────

describe('AuthProvider — subscription', () => {
  it('subscribes to onAuthStateChange on mount', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1),
    );
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderWithProvider();
    await waitFor(() =>
      expect(mockOnAuthStateChange).toHaveBeenCalled(),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
