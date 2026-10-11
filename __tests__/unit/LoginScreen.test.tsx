import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../app/login';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockAvailability = jest.fn();
const mockSignInApple = jest.fn();
const mockSignInGoogle = jest.fn();
const mockDestination = jest.fn();
jest.mock('../../services/socialAuth', () => ({
  getSocialAvailability: (...a: unknown[]) => mockAvailability(...a),
  signInWithApple: (...a: unknown[]) => mockSignInApple(...a),
  signInWithGoogle: (...a: unknown[]) => mockSignInGoogle(...a),
  getDestinationAfterSocialSignIn: (...a: unknown[]) => mockDestination(...a),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: (props: Record<string, unknown>) => <View testID={`icon-${props.name}`} />,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAvailability.mockResolvedValue({ apple: { available: true }, google: { available: true } });
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

  it('Apple and Google no longer route to /signup — they run the native sign-in flows', () => {
    mockSignInApple.mockResolvedValue({ status: 'cancelled' });
    mockSignInGoogle.mockResolvedValue({ status: 'cancelled' });
    fireEvent.press(screen.getByRole('button', { name: 'Sign up with Apple' }));
    fireEvent.press(screen.getByRole('button', { name: 'Sign up with Google' }));
    expect(mockPush).not.toHaveBeenCalledWith('/signup');
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
      'Sign up with email',
      'Already have an account? Log in',
    ];
    buttons.forEach((label, i) => {
      fireEvent.press(screen.getByRole('button', { name: label }));
      expect(mockPush).toHaveBeenCalledTimes(i + 1);
    });
  });
});


// ─── Social sign-in (Apple / Google) ──────────────────────────────────────────

describe('LoginScreen — Apple / Google sign-in', () => {
  const okResult = { status: 'ok', userId: 'u1', displayName: 'Aoife Kelly', email: 'a@x.ie' };

  it('a successful Apple sign-in for a NEW account goes to /complete-account with the provider name', async () => {
    mockSignInApple.mockResolvedValue(okResult);
    mockDestination.mockResolvedValue({ ok: true, destination: '/complete-account' });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('apple-button'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/complete-account', params: { name: 'Aoife Kelly' } }),
    );
    expect(mockDestination).toHaveBeenCalledWith('u1');
  });

  it('a returning social user is routed by the shared rules (never-verified → /id-verify)', async () => {
    mockSignInGoogle.mockResolvedValue(okResult);
    mockDestination.mockResolvedValue({ ok: true, destination: '/id-verify' });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('google-button'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
  });

  it('a cancelled sign-in is handled quietly — no error, no navigation', async () => {
    mockSignInApple.mockResolvedValue({ status: 'cancelled' });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('apple-button'));
    await waitFor(() => expect(mockSignInApple).toHaveBeenCalled());
    expect(screen.queryByTestId('social-error')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a failed sign-in shows the friendly message and stays on this screen', async () => {
    mockSignInGoogle.mockResolvedValue({ status: 'error', message: "We couldn't sign you in with Google. Please try again." });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('google-button'));
    await waitFor(() => expect(screen.getByTestId('social-error')).toHaveTextContent(/couldn't sign you in with Google/));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('signed in but the account lookup fails → an error, not a guessed destination', async () => {
    mockSignInApple.mockResolvedValue(okResult);
    mockDestination.mockResolvedValue({ ok: false });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('apple-button'));
    await waitFor(() => expect(screen.getByTestId('social-error')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('Google without client IDs shows a clear "not available yet" state and is NOT pressable', async () => {
    mockAvailability.mockResolvedValue({ apple: { available: true }, google: { available: false, reason: 'not_configured' } });
    render(<LoginScreen />);
    await waitFor(() => expect(screen.getByTestId('google-unavailable')).toHaveTextContent(/Google sign-in isn't available yet/));
    expect(screen.getByTestId('google-button').props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('google-button'));
    expect(mockSignInGoogle).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith('/signup');
  });

  it('Apple on an unsupported device explains why', async () => {
    mockAvailability.mockResolvedValue({ apple: { available: false, reason: 'unsupported_platform' }, google: { available: true } });
    render(<LoginScreen />);
    await waitFor(() => expect(screen.getByTestId('apple-unavailable')).toHaveTextContent(/isn't available on this device/));
    expect(screen.queryByTestId('google-unavailable')).toBeNull();
  });

  it('if Supabase reports the provider as not enabled yet, the button flips to "not available yet"', async () => {
    mockSignInGoogle.mockResolvedValue({ status: 'unavailable', reason: 'provider_disabled' });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('google-button'));
    await waitFor(() => expect(screen.getByTestId('google-unavailable')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('the email button still goes to /signup', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign up with email' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });
});
