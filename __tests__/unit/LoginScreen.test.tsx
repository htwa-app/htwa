import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../app/login';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: (props: Record<string, unknown>) => <View testID={`icon-${props.name}`} />,
  };
});

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

  it('displays the logo wordmark "htwa."', () => {
    expect(screen.getByText('htwa.')).toBeTruthy();
  });

  it('renders the amber dot with testID logo-dot', () => {
    expect(screen.getByTestId('logo-dot')).toBeTruthy();
  });
});

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('LoginScreen — layout', () => {
  beforeEach(() => render(<LoginScreen />));

  it('displays the social proof text', () => {
    expect(screen.getByText('2,400+ verified students')).toBeTruthy();
  });

  it('displays the trust note', () => {
    expect(screen.getByText('Mandatory ID + selfie verification before app use')).toBeTruthy();
  });

  it('displays the footer text', () => {
    expect(
      screen.getByText('By continuing you agree to our Terms & Community Safety Pledge')
    ).toBeTruthy();
  });

  it('renders the Sign up with Apple button', () => {
    expect(screen.getByRole('button', { name: 'Sign up with Apple' })).toBeTruthy();
  });

  it('renders the Sign up with Google button', () => {
    expect(screen.getByRole('button', { name: 'Sign up with Google' })).toBeTruthy();
  });

  it('renders the Sign up with email button', () => {
    expect(screen.getByRole('button', { name: 'Sign up with email' })).toBeTruthy();
  });

  it('does NOT render a mobile number option', () => {
    expect(screen.queryByRole('button', { name: 'Sign up with mobile number' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue with mobile number' })).toBeNull();
  });

  it('renders the "Already have an account? Log in" link', () => {
    expect(screen.getByRole('button', { name: 'Already have an account? Log in' })).toBeTruthy();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('LoginScreen — navigation', () => {
  beforeEach(() => render(<LoginScreen />));

  it('Sign up with Apple button does not throw on press', () => {
    expect(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Sign up with Apple' }))
    ).not.toThrow();
  });

  it('Sign up with Apple calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign up with Apple' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('Sign up with Google calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign up with Google' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('Sign up with email calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign up with email' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('"Already have an account? Log in" calls router.push with /login-email', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Already have an account? Log in' }));
    expect(mockPush).toHaveBeenCalledWith('/login-email');
  });

  it('each button press calls router.push exactly once', () => {
    const buttons = [
      'Sign up with Apple',
      'Sign up with Google',
      'Sign up with email',
      'Already have an account? Log in',
    ];
    buttons.forEach((label, i) => {
      fireEvent.press(screen.getByRole('button', { name: label }));
      expect(mockPush).toHaveBeenCalledTimes(i + 1);
    });
  });
});
