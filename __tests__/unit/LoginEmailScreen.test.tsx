/**
 * __tests__/unit/LoginEmailScreen.test.tsx
 * Unit tests for app/login-email.tsx — returning-user sign-in, email step.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInWithOtp = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  },
}));

import LoginEmailScreen from '../../app/login-email';

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithOtp.mockResolvedValue({ error: null });
});

describe('LoginEmailScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<LoginEmailScreen />)).not.toThrow();
  });
});

describe('LoginEmailScreen — layout', () => {
  beforeEach(() => render(<LoginEmailScreen />));

  it('displays the "Log in" title', () => {
    expect(screen.getByText('Log in')).toBeTruthy();
  });

  it('renders the email input', () => {
    expect(screen.getByTestId('login-email-input')).toBeTruthy();
  });

  it('renders the Continue button', () => {
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });
});

describe('LoginEmailScreen — validation', () => {
  beforeEach(() => render(<LoginEmailScreen />));

  it('Continue is disabled with an empty email', () => {
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled with a malformed email', () => {
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'not-an-email');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is enabled with a valid email', () => {
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'returning@ucd.ie');
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
  });
});

describe('LoginEmailScreen — submit', () => {
  it('calls signInWithOtp with shouldCreateUser: false (never creates a new account)', async () => {
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'returning@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'returning@ucd.ie',
      options: { shouldCreateUser: false },
    }));
  });

  it('navigates to /verify with mode "login" and the email on success', async () => {
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'returning@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
      pathname: '/verify',
      params: { email: 'returning@ucd.ie', mode: 'login' },
    }));
  });

  it('shows a "no account found" message and does not navigate when signInWithOtp errors', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Signups not allowed for otp' } });
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'nobody@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('login-email-error')).toBeTruthy());
    expect(screen.getByTestId('login-email-error')).toHaveTextContent(/couldn't find an account/i);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not surface the raw Supabase error message', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Signups not allowed for otp' } });
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'nobody@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('login-email-error')).toBeTruthy());
    expect(screen.queryByText(/signups not allowed/i)).toBeNull();
  });

  it('offers a "Sign up instead" link when no account is found', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Signups not allowed for otp' } });
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'nobody@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign up instead' })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Sign up instead' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('shows a generic retry message (not "no account") when signInWithOtp errors for a reason other than missing account', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'For security purposes, you can only request this after 34 seconds' } });
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'returning@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('login-email-error')).toBeTruthy());
    expect(screen.getByTestId('login-email-error')).not.toHaveTextContent(/couldn't find an account/i);
    expect(screen.queryByRole('button', { name: 'Sign up instead' })).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows a generic error and does not navigate when signInWithOtp throws', async () => {
    mockSignInWithOtp.mockRejectedValue(new Error('network'));
    render(<LoginEmailScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'returning@ucd.ie');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('login-email-error')).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('LoginEmailScreen — navigation', () => {
  it('"Back to sign-in options" navigates to /login', () => {
    render(<LoginEmailScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Back to sign-in options' }));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
