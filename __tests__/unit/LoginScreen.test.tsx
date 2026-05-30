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

  it('renders the Continue with Apple button', () => {
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
  });

  it('renders the Continue with Google button', () => {
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  });

  it('renders the Continue with mobile number button', () => {
    expect(screen.getByRole('button', { name: 'Continue with mobile number' })).toBeTruthy();
  });

  it('renders the Continue with email button', () => {
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeTruthy();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('LoginScreen — navigation', () => {
  beforeEach(() => render(<LoginScreen />));

  it('Continue with Apple button does not throw on press', () => {
    expect(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }))
    ).not.toThrow();
  });

  it('Continue with Apple calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('Continue with Google calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('Continue with mobile number calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continue with mobile number' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('Continue with email calls router.push with /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('each button press calls router.push exactly once', () => {
    const buttons = [
      'Continue with Apple',
      'Continue with Google',
      'Continue with mobile number',
      'Continue with email',
    ];
    buttons.forEach((label, i) => {
      fireEvent.press(screen.getByRole('button', { name: label }));
      expect(mockPush).toHaveBeenCalledTimes(i + 1);
    });
  });
});
