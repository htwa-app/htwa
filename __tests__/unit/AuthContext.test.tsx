/**
 * __tests__/unit/AuthContext.test.tsx
 *
 * Unit tests for context/AuthContext.tsx (Stage 20A; updated 19 Jul for
 * universal identity verification — verificationStatus replaces the old
 * id_verified/selfie_verified boolean pair).
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
const mockMaybeSingle      = jest.fn();
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
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
    }),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Renders a component that exposes AuthContext values as testable text nodes. */
function TestConsumer() {
  const { user, session, isLoading, verificationStatus } = useAuth();
  return (
    <View>
      <Text testID="isLoading">{String(isLoading)}</Text>
      <Text testID="verificationStatus">{String(verificationStatus)}</Text>
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

  // Default: no verification row (never submitted)
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
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

  it('verificationStatus is null when there is no session', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('verificationStatus').props.children).toBe('null'),
    );
  });

  it('does not call supabase.from when there is no session', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });
});

// ─── Session exists, never submitted identity verification ──────────────────

describe('AuthProvider — session but no verification row yet', () => {
  const fakeUser    = { id: 'user-123' };
  const fakeSession = { user: fakeUser };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('sets session and user', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('hasSession').props.children).toBe('true'),
    );
    expect(screen.getByTestId('hasUser').props.children).toBe('true');
  });

  it('verificationStatus is null when no row exists', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
    expect(screen.getByTestId('verificationStatus').props.children).toBe('null');
  });

  it('queries the verification table for the correct user', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(mockMaybeSingle).toHaveBeenCalledTimes(1),
    );
  });
});

// ─── Session exists, pending review ──────────────────────────────────────────

describe('AuthProvider — session, submitted but pending review', () => {
  const fakeUser    = { id: 'user-456' };
  const fakeSession = { user: fakeUser };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockMaybeSingle.mockResolvedValue({ data: { status: 'pending' }, error: null });
  });

  it('verificationStatus is "pending"', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('verificationStatus').props.children).toBe('pending'),
    );
  });

  it('isLoading becomes false after the fetch', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('isLoading').props.children).toBe('false'),
    );
  });
});

// ─── Session exists, approved ─────────────────────────────────────────────────

describe('AuthProvider — session, approved', () => {
  const fakeSession = { user: { id: 'user-789' } };

  it('verificationStatus is "approved"', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockMaybeSingle.mockResolvedValue({ data: { status: 'approved' }, error: null });
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('verificationStatus').props.children).toBe('approved'),
    );
  });

  it('verificationStatus is "rejected" when the row says so', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    mockMaybeSingle.mockResolvedValue({ data: { status: 'rejected' }, error: null });
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('verificationStatus').props.children).toBe('rejected'),
    );
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

  it('resets verificationStatus to null when the auth event reports signed-out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockMaybeSingle.mockResolvedValue({ data: { status: 'approved' }, error: null });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('verificationStatus').props.children).toBe('approved'));

    const authChangeHandler = mockOnAuthStateChange.mock.calls[0][0] as (event: string, session: unknown) => void;
    authChangeHandler('SIGNED_OUT', null);
    await waitFor(() => expect(screen.getByTestId('verificationStatus').props.children).toBe('null'));
  });
});
