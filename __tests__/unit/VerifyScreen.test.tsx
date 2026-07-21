import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import VerifyScreen from '../../app/verify';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockReplace = jest.fn();
let mockParams: { email?: string; mode?: string } = { email: 'test@ucd.ie' };
jest.mock('expo-router', () => ({
  useRouter:            () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams:  () => mockParams,
}));

const mockVerifyOtp          = jest.fn();
const mockResend             = jest.fn();
const mockSignInWithOtp      = jest.fn();
const mockUsersUpsert        = jest.fn();
const mockUsersSelect        = jest.fn();
const mockVerificationUpsert = jest.fn();
const mockVerificationSelect = jest.fn();
const mockProfilesSelect     = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp:      (...args: unknown[]) => mockVerifyOtp(...args),
      resend:         (...args: unknown[]) => mockResend(...args),
      signInWithOtp:  (...args: unknown[]) => mockSignInWithOtp(...args),
    },
    from: (table: string) => {
      if (table === 'users') {
        return {
          upsert: (...args: unknown[]) => mockUsersUpsert(...args),
          select: () => ({ eq: () => ({ maybeSingle: () => mockUsersSelect() }) }),
        };
      }
      if (table === 'verification') {
        return {
          upsert: (...args: unknown[]) => mockVerificationUpsert(...args),
          select: () => ({ eq: () => ({ maybeSingle: () => mockVerificationSelect() }) }),
        };
      }
      // profiles
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => mockProfilesSelect() }) }),
      };
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { email: 'test@ucd.ie' }; // no mode -> defaults to 'signup'

  // Happy path defaults: a fresh signup, not yet verified, no profile.
  mockVerifyOtp.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
  mockUsersUpsert.mockResolvedValue({ error: null });
  mockUsersSelect.mockResolvedValue({ data: { id: 'user-123' }, error: null });
  mockVerificationUpsert.mockResolvedValue({ error: null });
  // No row yet = never submitted identity verification (verify.tsx no longer
  // pre-creates a stub row — see the comment in routeByCurrentState).
  mockVerificationSelect.mockResolvedValue({ data: null, error: null });
  mockProfilesSelect.mockResolvedValue({ data: null, error: null });
  mockResend.mockResolvedValue({ error: null });
  mockSignInWithOtp.mockResolvedValue({ error: null });
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

  it('shows an error (does not crash) when resend throws', async () => {
    mockResend.mockRejectedValue(new Error('network'));
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    await waitFor(() => expect(screen.getByTestId('verify-error')).toHaveTextContent(/unable to resend/i));
  });
});

// ─── Fresh signup (mode: signup, default) ──────────────────────────────────────

describe('VerifyScreen — fresh signup', () => {
  it('upserts users with onConflict "id" (not a raw insert)', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockUsersUpsert).toHaveBeenCalledTimes(1));
    expect(mockUsersUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-123' }),
      { onConflict: 'id' },
    );
  });

  it('does not write to public.verification on signup — id-verify.tsx is the sole writer of that row', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockUsersUpsert).toHaveBeenCalledTimes(1));
    expect(mockVerificationUpsert).not.toHaveBeenCalled();
  });

  it('routes to /id-verify when not yet verified (the normal fresh-signup case)', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
  });

  it('does not call the login-only users existence check', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    expect(mockUsersSelect).not.toHaveBeenCalled();
  });

  it('shows a friendly message (not the raw DB error) when the users upsert fails', async () => {
    mockUsersUpsert.mockResolvedValueOnce({ error: { message: 'duplicate key value violates unique constraint "users_pkey"' } });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(screen.getByTestId('verify-error')).toBeTruthy());
    expect(screen.queryByText(/duplicate key/i)).toBeNull();
    expect(screen.getByTestId('verify-error')).toHaveTextContent(/went wrong/i);
  });

  it('Verify button navigates to /id-verify when pressed with all 6 digits', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    // Wait for auto-submit to finish so isSubmittingRef resets to false
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    jest.clearAllMocks();
    mockUsersUpsert.mockResolvedValue({ error: null });
    mockVerificationUpsert.mockResolvedValue({ error: null });
    mockVerificationSelect.mockResolvedValue({ data: null, error: null });
    mockProfilesSelect.mockResolvedValue({ data: null, error: null });
    fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('"Wrong email? Go back" navigates to /signup', () => {
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Wrong email? Go back' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });
});

// ─── Interrupted-signup retry (idempotency regression) ─────────────────────────

describe('VerifyScreen — interrupted-signup retry', () => {
  it('succeeds (no duplicate-key error) and routes correctly when the account already partially exists', async () => {
    // Simulates: a first signup attempt got as far as creating the users row
    // (and maybe the verification row too) but the app was closed before
    // routing away. The user retries via /signup -> a fresh OTP -> this
    // screen again, with the SAME auth user id. The old code's plain
    // .insert() would throw "duplicate key value violates unique constraint
    // users_pkey" here; upsert must succeed instead.
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockUsersUpsert).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('verify-error')).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
  });

  it('does not reset an already-approved user back to unsubmitted on retry', async () => {
    // The verification row already exists and is approved from a PRIOR run
    // of this exact flow (e.g. the user got all the way through id-verify
    // before, then somehow ended up back on /verify). verify.tsx no longer
    // writes to public.verification at all on this path, so the existing
    // approved row is left alone, and the routing read below reflects that
    // real state.
    mockVerificationSelect.mockResolvedValue({ data: { status: 'approved' }, error: null });
    mockProfilesSelect.mockResolvedValue({ data: { user_id: 'user-123' }, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('routes to /profile-setup when the retry finds the user approved but without a profile yet', async () => {
    mockVerificationSelect.mockResolvedValue({ data: { status: 'approved' }, error: null });
    mockProfilesSelect.mockResolvedValue({ data: null, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/profile-setup'));
  });
});

// ─── Returning user via log in (mode: login) ───────────────────────────────────

describe('VerifyScreen — returning user (mode: login)', () => {
  beforeEach(() => {
    mockParams = { email: 'returning@ucd.ie', mode: 'login' };
  });

  it('never writes to public.users on this path', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockUsersUpsert).not.toHaveBeenCalled();
  });

  it('never writes to public.verification on this path', async () => {
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockVerificationUpsert).not.toHaveBeenCalled();
  });

  it('routes a fully approved, fully set-up returning user straight to /(tabs)', async () => {
    mockVerificationSelect.mockResolvedValue({ data: { status: 'approved' }, error: null });
    mockProfilesSelect.mockResolvedValue({ data: { user_id: 'user-123' }, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('routes a returning user who never submitted identity verification to /id-verify', async () => {
    mockVerificationSelect.mockResolvedValue({ data: null, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
  });

  it('routes a returning user with a pending review and no profile to /profile-setup (browsing is allowed pre-approval)', async () => {
    mockVerificationSelect.mockResolvedValue({ data: { status: 'pending' }, error: null });
    mockProfilesSelect.mockResolvedValue({ data: null, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/profile-setup'));
  });

  it('shows "no account found" with a sign-up link, and does not route, when no users row exists', async () => {
    mockUsersSelect.mockResolvedValue({ data: null, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(screen.getByTestId('verify-error')).toHaveTextContent(/couldn't find an account/i));
    expect(screen.getByRole('button', { name: 'Sign up instead' })).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('pressing "Sign up instead" navigates to /signup', async () => {
    mockUsersSelect.mockResolvedValue({ data: null, error: null });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign up instead' })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Sign up instead' }));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });

  it('shows a friendly message (not a raw DB error) when the users existence check fails', async () => {
    mockUsersSelect.mockResolvedValue({ data: null, error: { message: 'connection reset' } });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(screen.getByTestId('verify-error')).toBeTruthy());
    expect(screen.queryByText(/connection reset/i)).toBeNull();
    // A query failure must not be treated as "no account" (which requires a
    // real Sign-up link) — different UI, different message.
    expect(screen.queryByRole('button', { name: 'Sign up instead' })).toBeNull();
  });

  it('shows a friendly message when the state-check (verification/profile) queries fail', async () => {
    mockVerificationSelect.mockResolvedValue({ data: null, error: { message: 'db down' } });
    render(<VerifyScreen />);
    fillDigits(6);
    await waitFor(() => expect(screen.getByTestId('verify-error')).toBeTruthy());
    expect(screen.queryByText(/db down/i)).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('"Wrong email? Go back" navigates to /login-email (not /signup)', () => {
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Wrong email? Go back' }));
    expect(mockPush).toHaveBeenCalledWith('/login-email');
  });

  it('resend calls signInWithOtp (not resend) — resend() does not support passwordless sign-in OTPs', () => {
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'returning@ucd.ie',
      options: { shouldCreateUser: false },
    });
    expect(mockResend).not.toHaveBeenCalled();
  });

  it('shows a generic message (not the raw Supabase error) when the login-mode resend fails', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'over_email_send_rate_limit: too many requests' } });
    render(<VerifyScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    await waitFor(() => expect(screen.getByTestId('verify-error')).toHaveTextContent(/unable to resend/i));
    expect(screen.queryByText(/rate_limit/i)).toBeNull();
  });
});
