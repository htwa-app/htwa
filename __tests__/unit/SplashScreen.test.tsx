import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '../../app/screens/SplashScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no token stored
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
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
});

// ─── Auth routing ─────────────────────────────────────────────────────────────

describe('SplashScreen — auth routing', () => {
  it('navigates to /home when a valid auth token is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('valid-token-abc');
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });

  it('navigates to /login when no auth token is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockReplace).not.toHaveBeenCalledWith('/home');
  });

  it('navigates to /login when storage throws an error (safe default)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Disk read failure'));
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockReplace).not.toHaveBeenCalledWith('/home');
  });

  it('reads from the correct storage key (auth_token)', async () => {
    render(<SplashScreen />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith('auth_token'));
  });

  it('only calls router.replace once per mount', async () => {
    render(<SplashScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  });
});
