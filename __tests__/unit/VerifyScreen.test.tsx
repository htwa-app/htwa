import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import VerifyScreen from '../../app/verify';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter:            () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({ email: 'test@ucd.ie' }),
}));

const mockVerifyOtp = jest.fn();
const mockResend    = jest.fn();
const mockInsert    = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      resend:    (...args: unknown[]) => mockResend(...args),
    },
    from: () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
      upsert: (...args: unknown[]) => mockInsert(...args), // verification row uses upsert
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: verifyOtp succeeds
  mockVerifyOtp.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
  // Default: inserts succeed
  mockInsert.mockResolvedValue({ error: null });
  // Default: resend succeeds
  mockResend.mockResolvedValue({ error: null });
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

  it('shows countdown text after Resend resolves successfully', async () => {
    jest.useFakeTimers();
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    await waitFor(() => expect(screen.getByText('Resend in 1:00')).toBeTruthy());
  });

  it('Resend button is disabled during the cooldown', async () => {
    jest.useFakeTimers();
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resend in 1:00' })).toBeDisabled());
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('VerifyScreen — navigation', () => {
  beforeEach(() => render(<VerifyScreen />));

  it('"Wrong email? Go back" navigates to /signup', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Wrong email? Go back' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('auto-submits to /id-verify when the 6th digit is entered', async () => {
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
  });

  it('Verify button navigates to /id-verify when pressed with all 6 digits', async () => {
    fillDigits(6);
    // Wait for auto-submit to finish so isSubmittingRef resets to false
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    jest.clearAllMocks();
    fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});

// ─── Verify errors ────────────────────────────────────────────────────────────

describe('VerifyScreen — verify errors', () => {
  beforeEach(() => render(<VerifyScreen />));

  it('shows an error message when verifyOtp returns an error', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data:  { user: null },
      error: { message: 'Invalid OTP' },
    });
    fillDigits(6);
    await waitFor(() => expect(screen.getByText('Invalid OTP')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── DB inserts ───────────────────────────────────────────────────────────────

describe('VerifyScreen — DB inserts', () => {
  beforeEach(() => render(<VerifyScreen />));

  it('inserts into public.users and public.verification on successful verify', async () => {
    fillDigits(6);
    await waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(2));
  });
});

// ─── Resend ───────────────────────────────────────────────────────────────────

describe('VerifyScreen — resend supabase call', () => {
  it('calls supabase.auth.resend with the correct email and type', () => {
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(mockResend).toHaveBeenCalledWith({
      email: 'test@ucd.ie',
      type:  'signup',
    });
  });
});
