/**
 * __tests__/unit/IdVerifyScreen.test.tsx
 *
 * Unit tests for app/id-verify.tsx — universal identity verification
 * (19 Jul safety follow-up). Every user (not just drivers) confirms date of
 * birth and provides a photo ID + live selfie, then waits for manual review
 * (pending -> approved/rejected). Submitting (not approval) unlocks the rest
 * of the app; only booking/posting requires 'approved' (enforced elsewhere).
 *
 * Supersedes the old Stage 20C beta-placeholder tests (a single "Start
 * verification" button that wrote id_verified/selfie_verified booleans
 * directly) — the whole screen was rebuilt around photo tiles, a DOB field,
 * and the shared pending/approved/rejected review-status banner pattern
 * already used by driver-verification.tsx.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// A controllable stand-in for the native date picker field — exposes value
// as a plain text input so tests can set the DOB without depending on the
// native @react-native-community/datetimepicker module (same pattern as
// OfferRideScreen.test.tsx).
jest.mock('../../components/DateTimeField', () => {
  const { TextInput } = require('react-native');
  return {
    DateTimeField: (props: Record<string, unknown>) => (
      <TextInput
        testID={props.testID as string}
        value={(props.value as string) ?? ''}
        onChangeText={props.onChange}
      />
    ),
  };
});

const mockGetIdentityVerification    = jest.fn();
const mockSubmitIdentityVerification = jest.fn();
jest.mock('../../services/identityVerification', () => ({
  getIdentityVerification:    (...a: unknown[]) => mockGetIdentityVerification(...a),
  submitIdentityVerification: (...a: unknown[]) => mockSubmitIdentityVerification(...a),
}));

const mockCaptureSelfie = jest.fn();
const mockPickDocument  = jest.fn();
jest.mock('../../services/imagePicker', () => ({
  captureVerificationSelfie: (...a: unknown[]) => mockCaptureSelfie(...a),
  pickIdentityDocument:      (...a: unknown[]) => mockPickDocument(...a),
}));

const mockRefreshVerification = jest.fn();
const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockProfilesMaybeSingle = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mockProfilesMaybeSingle() }) }) }),
  },
}));

import IdVerifyScreen from '../../app/id-verify';
import type { VerificationRow } from '../../types/database';

const ID_BYTES     = new Uint8Array([1]);
const SELFIE_BYTES = new Uint8Array([2]);

const APPROVED_ROW: VerificationRow = {
  id: 'v1', user_id: 'user-123',
  selfie_url: 'user-123/selfie-1.jpg', verified_at: null,
  date_of_birth: '2000-01-01', id_document_path: 'user-123/id-1.jpg',
  status: 'approved', review_note: null,
  submitted_at: '2026-07-01T00:00:00Z', reviewed_at: '2026-07-02T00:00:00Z',
};

// A DOB comfortably older than the 13-year plausibility floor.
const VALID_DOB = '2000-06-15';

async function fillDob(dob = VALID_DOB): Promise<void> {
  await waitFor(() => expect(screen.getByTestId('dob-field')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('dob-field'), dob);
}

async function addAllPhotos(): Promise<void> {
  await waitFor(() => expect(screen.getByTestId('photo-idDocument')).toBeTruthy());
  fireEvent.press(screen.getByTestId('photo-idDocument'));
  await waitFor(() => expect(mockPickDocument).toHaveBeenCalled());
  fireEvent.press(screen.getByTestId('photo-selfie'));
  await waitFor(() => expect(mockCaptureSelfie).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-123' }, isLoading: false, refreshVerification: mockRefreshVerification,
  });
  mockGetIdentityVerification.mockResolvedValue({ ok: true, verification: null });
  mockSubmitIdentityVerification.mockResolvedValue({ ok: true, verification: APPROVED_ROW });
  mockCaptureSelfie.mockResolvedValue({ bytes: SELFIE_BYTES, source: 'camera' });
  mockPickDocument.mockResolvedValue(ID_BYTES);
  mockRefreshVerification.mockResolvedValue(undefined);
  mockProfilesMaybeSingle.mockResolvedValue({ data: { user_id: 'user-123' }, error: null });
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('IdVerifyScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<IdVerifyScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('id-verify-screen')).toBeTruthy());
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('IdVerifyScreen — auth guard', () => {
  it('redirects to /login when user is null and loading is false', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, refreshVerification: mockRefreshVerification });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('does not redirect while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, refreshVerification: mockRefreshVerification });
    render(<IdVerifyScreen />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── Loading & load error ─────────────────────────────────────────────────────

describe('IdVerifyScreen — loading & load error', () => {
  it('shows a loading state initially', () => {
    mockGetIdentityVerification.mockReturnValue(new Promise(() => {}));
    render(<IdVerifyScreen />);
    expect(screen.getByTestId('id-verify-loading')).toBeTruthy();
  });

  it('shows a load error with retry when the fetch fails (not a blank first-time form)', async () => {
    mockGetIdentityVerification.mockResolvedValueOnce({ ok: false });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('id-verify-load-error')).toBeTruthy());
    mockGetIdentityVerification.mockResolvedValue({ ok: true, verification: null });
    fireEvent.press(screen.getByTestId('id-verify-retry'));
    await waitFor(() => expect(screen.getByTestId('id-verify-screen')).toBeTruthy());
  });
});

// ─── Status banners ───────────────────────────────────────────────────────────

describe('IdVerifyScreen — status banners', () => {
  it('shows the mandatory-gate subtitle when never submitted (status null)', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByText(/one-time step/i)).toBeTruthy());
    expect(screen.queryByTestId('status-pending')).toBeNull();
  });

  it('shows the pending banner and lets browsing continue, with the submit button labelled "Resubmit"', async () => {
    mockGetIdentityVerification.mockResolvedValue({ ok: true, verification: { ...APPROVED_ROW, status: 'pending' } });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('status-pending')).toBeTruthy());
    expect(screen.getByTestId('id-verify-submit')).toHaveTextContent('Resubmit for review');
  });

  it('shows the approved banner', async () => {
    mockGetIdentityVerification.mockResolvedValue({ ok: true, verification: APPROVED_ROW });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('status-approved')).toBeTruthy());
  });

  it('shows the rejected banner with the review note when present', async () => {
    mockGetIdentityVerification.mockResolvedValue({
      ok: true,
      verification: { ...APPROVED_ROW, status: 'rejected', review_note: 'Photo ID was blurry.' },
    });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('status-rejected')).toBeTruthy());
    expect(screen.getByTestId('status-rejected')).toHaveTextContent(/photo id was blurry/i);
  });

  it('shows a generic rejected message when there is no review note', async () => {
    mockGetIdentityVerification.mockResolvedValue({
      ok: true,
      verification: { ...APPROVED_ROW, status: 'rejected', review_note: null },
    });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('status-rejected')).toBeTruthy());
    expect(screen.getByTestId('status-rejected')).toHaveTextContent(/not approved/i);
  });
});

// ─── Photo tiles ──────────────────────────────────────────────────────────────

describe('IdVerifyScreen — photo tiles', () => {
  it('the idDocument tile uses the library picker, never the camera', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-idDocument')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-idDocument'));
    await waitFor(() => expect(mockPickDocument).toHaveBeenCalled());
    expect(mockCaptureSelfie).not.toHaveBeenCalled();
  });

  it('the selfie tile uses the live camera capture', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-selfie'));
    await waitFor(() => expect(mockCaptureSelfie).toHaveBeenCalled());
    expect(mockPickDocument).not.toHaveBeenCalled();
  });

  it('marks a tile done and ready-to-submit once a fresh photo is captured', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-selfie'));
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toHaveTextContent(/ready to submit/i));
  });

  it('shows photos already on file as done, without requiring a recapture', async () => {
    mockGetIdentityVerification.mockResolvedValue({ ok: true, verification: APPROVED_ROW });
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-idDocument')).toHaveTextContent(/on file/i));
    expect(screen.getByTestId('photo-selfie')).toHaveTextContent(/on file/i);
  });

  it('shows an error and does not crash when opening the picker fails', async () => {
    mockPickDocument.mockRejectedValue(new Error('permission denied'));
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-idDocument')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-idDocument'));
    await waitFor(() => expect(screen.getByTestId('id-verify-message')).toHaveTextContent(/could not open the camera or photo picker/i));
  });
});

// ─── Date of birth: 18+ age gate ──────────────────────────────────────────────

describe('IdVerifyScreen — 18+ age gate', () => {
  it('blocks a DOB under 18 with a dedicated message and disables submit', async () => {
    render(<IdVerifyScreen />);
    await addAllPhotos();
    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 5);
    await fillDob(tooYoung.toISOString().slice(0, 10));
    await waitFor(() => expect(screen.getByTestId('dob-underage')).toHaveTextContent(/18 or older/i));
    expect(screen.queryByTestId('dob-implausible')).toBeNull();
    expect(screen.getByTestId('id-verify-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('blocks a DOB exactly one day short of the 18th birthday', async () => {
    render(<IdVerifyScreen />);
    await addAllPhotos();
    const almost18 = new Date();
    almost18.setFullYear(almost18.getFullYear() - 18);
    almost18.setDate(almost18.getDate() + 1); // turns 18 tomorrow, not yet today
    await fillDob(almost18.toISOString().slice(0, 10));
    await waitFor(() => expect(screen.getByTestId('dob-underage')).toBeTruthy());
  });

  it('accepts a DOB exactly at the 18th birthday', async () => {
    render(<IdVerifyScreen />);
    const exactly18 = new Date();
    exactly18.setFullYear(exactly18.getFullYear() - 18);
    await fillDob(exactly18.toISOString().slice(0, 10));
    expect(screen.queryByTestId('dob-underage')).toBeNull();
    expect(screen.queryByTestId('dob-implausible')).toBeNull();
  });

  it('accepts a plausible adult DOB and shows no warning', async () => {
    render(<IdVerifyScreen />);
    await fillDob();
    expect(screen.queryByTestId('dob-underage')).toBeNull();
    expect(screen.queryByTestId('dob-implausible')).toBeNull();
  });

  it('shows no warning before the field has been touched', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('dob-field')).toBeTruthy());
    expect(screen.queryByTestId('dob-underage')).toBeNull();
    expect(screen.queryByTestId('dob-implausible')).toBeNull();
  });
});

// ─── Submit gating ────────────────────────────────────────────────────────────

describe('IdVerifyScreen — submit gating', () => {
  it('submit is disabled until DOB and both photos are present, with an incomplete-photos hint', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('id-verify-submit')).toBeTruthy());
    expect(screen.getByTestId('id-verify-submit').props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId('id-verify-incomplete-hint')).toHaveTextContent(/photo id.*live selfie.*date of birth/i);

    await fillDob();
    // DOB alone is not enough — photos still missing.
    expect(screen.getByTestId('id-verify-submit').props.accessibilityState?.disabled).toBe(true);

    await addAllPhotos();
    await waitFor(() => expect(screen.getByTestId('id-verify-submit').props.accessibilityState?.disabled).toBe(false));
  });

  it('shows a DOB-specific hint once photos are complete but the date is missing/invalid', async () => {
    render(<IdVerifyScreen />);
    await addAllPhotos();
    await waitFor(() => expect(screen.getByTestId('id-verify-incomplete-hint')).toHaveTextContent(/valid date of birth/i));
  });

  it('labels the button "Submit for review" for a first-time submission', async () => {
    render(<IdVerifyScreen />);
    await waitFor(() => expect(screen.getByTestId('id-verify-submit')).toHaveTextContent('Submit for review'));
  });
});

// ─── Submit flow ──────────────────────────────────────────────────────────────

describe('IdVerifyScreen — submit', () => {
  async function completeAndSubmit(): Promise<void> {
    render(<IdVerifyScreen />);
    await addAllPhotos();
    await fillDob();
    await waitFor(() => expect(screen.getByTestId('id-verify-submit').props.accessibilityState?.disabled).toBe(false));
    fireEvent.press(screen.getByTestId('id-verify-submit'));
  }

  it('submits with the correct fields, photos, and existing row', async () => {
    await completeAndSubmit();
    await waitFor(() => expect(mockSubmitIdentityVerification).toHaveBeenCalledWith(
      'user-123',
      { dateOfBirth: VALID_DOB },
      { idDocumentBytes: ID_BYTES, selfieBytes: SELFIE_BYTES },
      null,
    ));
  });

  it('refreshes auth verification state and routes to /(tabs) when a profile already exists', async () => {
    await completeAndSubmit();
    await waitFor(() => expect(mockRefreshVerification).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('routes to /profile-setup when a profile does not exist yet', async () => {
    mockProfilesMaybeSingle.mockResolvedValue({ data: null, error: null });
    await completeAndSubmit();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/profile-setup'));
  });

  it('shows the returned message and does not navigate when submission fails', async () => {
    mockSubmitIdentityVerification.mockResolvedValue({ ok: false, message: 'Could not upload your ID document. Please try again.' });
    await completeAndSubmit();
    await waitFor(() => expect(screen.getByTestId('id-verify-message')).toHaveTextContent(/could not upload your id document/i));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows a generic message and resets the busy state when submit throws', async () => {
    mockSubmitIdentityVerification.mockRejectedValue(new Error('network'));
    await completeAndSubmit();
    await waitFor(() => expect(screen.getByTestId('id-verify-message')).toBeTruthy());
    expect(screen.getByTestId('id-verify-submit').props.accessibilityState?.disabled).toBe(false);
  });
});
