import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../app/login';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('LoginScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<LoginScreen />)).not.toThrow();
  });
});

// ─── Brand rules ──────────────────────────────────────────────────────────────

describe('LoginScreen — brand rules', () => {
  beforeEach(() => render(<LoginScreen />));

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

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('LoginScreen — layout', () => {
  beforeEach(() => render(<LoginScreen />));

  it('renders the Sign in button', () => {
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('renders the Retry button', () => {
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('LoginScreen — navigation', () => {
  it('Sign in button has an onPress handler that does not throw', () => {
    render(<LoginScreen />);
    expect(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Sign in' }))
    ).not.toThrow();
  });

  it('Sign in button calls router.push', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('Retry button calls router.replace with "/"', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
