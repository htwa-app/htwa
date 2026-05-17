/**
 * __tests__/unit/SplashScreen.test.tsx
 *
 * Unit tests for app/screens/SplashScreen.tsx.
 *
 * Stage 20A update: SplashScreen now reads auth state via useAuth() instead
 * of AsyncStorage. Tests mock the AuthContext module so the component can be
 * tested in isolation without a real AuthProvider or Supabase client.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import SplashScreen from '../../app/screens/SplashScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: still loading — no navigation should happen
  mockUseAuth.mockReturnValue({
    user:       null,
    session:    null,
    isLoading:  true,
    isVerified: false,
  });
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('SplashScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<SplashScreen />)).not.toThrow();
  });
});

// ─── Brand rules ──────────────────────────────────────────────────────────────

describe('SplashScreen — brand rules', () => {
  beforeEach(() => {
    render(<SplashScreen />);
  });

  it('displays the tagline in all-lowercase ending with a period', () => {
    expect(screen.getByText('heading that way anyway.')).toBeTruthy();
  });

  it('does NOT display the tagline with a question mark', () => {
    expect(screen.queryByText('heading that way anyway?')).toBeNull();
  });

  it('does NOT display the tagline in title case', () => {
    expect(screen.queryByText('Heading That Way Anyway.')).toBeNull();
  });

  it('renders the htwa. logo with amber dot', () => {
    expect(screen.getByText('htwa.')).toBeTruthy();
    expect(screen.getByTestId('logo-dot')).toBeTruthy();
  });
});

// ─── Auth routing ─────────────────────────────────────────────────────────────

describe('SplashScreen — auth routing', () => {
  it('does not navigate while isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, isLoading: true, isVerified: false,
    });
    render(<SplashScreen />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to /login when isLoading is false and there is no session', async () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, isLoading: false, isVerified: false,
    });
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)');
    expect(mockReplace).not.toHaveBeenCalledWith('/id-verify');
  });

  it('navigates to /id-verify when session exists but isVerified is false', async () => {
    mockUseAuth.mockReturnValue({
      user:       { id: 'user-123' },
      session:    { user: { id: 'user-123' } },
      isLoading:  false,
      isVerified: false,
    });
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)');
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });

  it('navigates to /(tabs) when session exists and isVerified is true', async () => {
    mockUseAuth.mockReturnValue({
      user:       { id: 'user-456' },
      session:    { user: { id: 'user-456' } },
      isLoading:  false,
      isVerified: true,
    });
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
    expect(mockReplace).not.toHaveBeenCalledWith('/id-verify');
  });

  it('only calls router.replace once per mount', async () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, isLoading: false, isVerified: false,
    });
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  });
});
