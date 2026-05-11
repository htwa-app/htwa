import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import VerifyScreen from '../../app/verify';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter:            () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ email: 'test@ucd.ie' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Enter digits into the first n OTP boxes. */
function fillDigits(count: number, digit = '1') {
  for (let i = 0; i < count; i++) {
    fireEvent.changeText(screen.getByTestId(`otp-input-${i}`), digit);
  }
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('VerifyScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<VerifyScreen />)).not.toThrow();
  });
});

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('VerifyScreen — layout', () => {
  beforeEach(() => render(<VerifyScreen />));

  it('displays the screen title', () => {
    expect(screen.getByText('Check your email')).toBeTruthy();
  });

  it('displays the subtitle with the email address', () => {
    expect(screen.getByText(/We sent a 6-digit code to test@ucd\.ie/)).toBeTruthy();
  });

  it('renders 6 OTP input boxes', () => {
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`otp-input-${i}`)).toBeTruthy();
    }
  });

  it('renders the Verify button', () => {
    expect(screen.getByRole('button', { name: 'Verify' })).toBeTruthy();
  });

  it('renders the Resend code button', () => {
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeTruthy();
  });

  it('renders the "Wrong email? Go back" link', () => {
    expect(screen.getByRole('button', { name: 'Wrong email? Go back' })).toBeTruthy();
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('VerifyScreen — validation', () => {
  beforeEach(() => render(<VerifyScreen />));

  it('Verify is disabled when no digits are entered', () => {
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('Verify is disabled when only 5 digits are entered', () => {
    fillDigits(5);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('Verify is enabled when all 6 digits are entered', () => {
    fillDigits(6);
    expect(screen.getByRole('button', { name: 'Verify' })).not.toBeDisabled();
  });
});

// ─── Resend cooldown ──────────────────────────────────────────────────────────

describe('VerifyScreen — resend cooldown', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows countdown text immediately after Resend is pressed', () => {
    jest.useFakeTimers();
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(screen.getByText('Resend in 1:00')).toBeTruthy();
  });

  it('Resend button is disabled during the cooldown', () => {
    jest.useFakeTimers();
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(screen.getByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('VerifyScreen — navigation', () => {
  beforeEach(() => render(<VerifyScreen />));

  it('"Wrong email? Go back" navigates to /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Wrong email? Go back' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('auto-submits to /id-verify when the 6th digit is entered', () => {
    fillDigits(6);
    expect(mockPush).toHaveBeenCalledWith('/id-verify');
  });

  it('Verify button navigates to /id-verify when pressed with all 6 digits', () => {
    fillDigits(6);
    jest.clearAllMocks(); // auto-submit may have already fired; test the button independently
    fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
    expect(mockPush).toHaveBeenCalledWith('/id-verify');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
