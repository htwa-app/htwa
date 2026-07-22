/**
 * __tests__/unit/DriverVerificationScreen.test.tsx
 * Round-2 fix #2 — tests for app/driver-verification.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }));

const mockGet = jest.fn();
const mockSubmit = jest.fn();
jest.mock('../../services/driverVerification', () => ({
  getDriverVerification: (...a: unknown[]) => mockGet(...a),
  submitDriverVerification: (...a: unknown[]) => mockSubmit(...a),
}));

const mockSelfie = jest.fn();
const mockLicence = jest.fn();
const mockCar = jest.fn();
jest.mock('../../services/imagePicker', () => ({
  captureVerificationSelfie: (...a: unknown[]) => mockSelfie(...a),
  pickLicencePhoto: (...a: unknown[]) => mockLicence(...a),
  pickCarPhoto: (...a: unknown[]) => mockCar(...a),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import DriverVerificationScreen from '../../app/driver-verification';
import type { DriverVerificationRow } from '../../types/database';

const ROW: DriverVerificationRow = {
  user_id: 'u1', licence_photo_path: 'u1/licence-1.jpg', selfie_photo_path: 'u1/selfie-1.jpg',
  car_photo_path: 'u1/car-1.jpg', car_make: 'Toyota', car_model: 'Corolla',
  car_registration: '191-D-12345', car_colour: 'Red', status: 'pending',
  review_note: null, submitted_at: 'x', reviewed_at: null,
};
const BYTES = new Uint8Array([1]);

async function fillFields(): Promise<void> {
  fireEvent.changeText(screen.getByTestId('dv-make'), 'Toyota');
  fireEvent.changeText(screen.getByTestId('dv-model'), 'Corolla');
  fireEvent.changeText(screen.getByTestId('dv-registration'), '191-D-12345');
  fireEvent.changeText(screen.getByTestId('dv-colour'), 'Red');
}

async function addAllPhotos(): Promise<void> {
  fireEvent.press(screen.getByTestId('photo-licence'));
  await waitFor(() => expect(mockLicence).toHaveBeenCalled());
  fireEvent.press(screen.getByTestId('photo-selfie'));
  await waitFor(() => expect(mockSelfie).toHaveBeenCalled());
  fireEvent.press(screen.getByTestId('photo-car'));
  await waitFor(() => expect(mockCar).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockGet.mockResolvedValue({ ok: true, verification: null });
  mockSubmit.mockResolvedValue({ ok: true, verification: ROW });
  mockSelfie.mockResolvedValue({ bytes: BYTES, source: 'camera' });
  mockLicence.mockResolvedValue(BYTES);
  mockCar.mockResolvedValue(BYTES);
});

describe('DriverVerificationScreen — gating', () => {
  it('submit is disabled until ALL photos and ALL fields are present', async () => {
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('dv-submit')).toBeTruthy());
    expect(screen.getByTestId('dv-submit').props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId('dv-incomplete-hint')).toBeTruthy();

    await fillFields();
    // Fields alone are not enough.
    expect(screen.getByTestId('dv-submit').props.accessibilityState?.disabled).toBe(true);

    await addAllPhotos();
    await waitFor(() => expect(screen.getByTestId('dv-submit').props.accessibilityState?.disabled).toBe(false));
  });

  it('the selfie tile uses the CAMERA capture, never the library', async () => {
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-selfie'));
    await waitFor(() => expect(mockSelfie).toHaveBeenCalled());
    expect(mockLicence).not.toHaveBeenCalled();
    expect(mockCar).not.toHaveBeenCalled();
  });

  it('labels the selfie tile "(dev fallback)" when the capture used the library', async () => {
    mockSelfie.mockResolvedValue({ bytes: BYTES, source: 'library-dev-fallback' });
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-selfie'));
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toHaveTextContent(/dev fallback/i));
  });

  it('a normal camera capture never shows the dev-fallback label', async () => {
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toBeTruthy());
    fireEvent.press(screen.getByTestId('photo-selfie'));
    await waitFor(() => expect(screen.getByTestId('photo-selfie')).toHaveTextContent(/ready to submit/i));
    expect(screen.getByTestId('photo-selfie')).not.toHaveTextContent(/dev fallback/i);
  });

  it('submits everything and lands in the pending state', async () => {
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('dv-make')).toBeTruthy());
    await fillFields();
    await addAllPhotos();
    await waitFor(() => expect(screen.getByTestId('dv-submit').props.accessibilityState?.disabled).toBe(false));
    fireEvent.press(screen.getByTestId('dv-submit'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith(
      'u1',
      { make: 'Toyota', model: 'Corolla', registration: '191-D-12345', colour: 'Red' },
      { licenceBytes: BYTES, selfieBytes: BYTES, carBytes: BYTES },
      null,
    ));
    await waitFor(() => expect(screen.getByTestId('status-pending')).toBeTruthy());
  });
});

describe('DriverVerificationScreen — states', () => {
  it('pending: banner + prefilled fields + photos on file', async () => {
    mockGet.mockResolvedValue({ ok: true, verification: ROW });
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('status-pending')).toBeTruthy());
    expect(screen.getByTestId('dv-make').props.value).toBe('Toyota');
    // Photos on file → submit possible without recapturing.
    expect(screen.getByTestId('dv-submit').props.accessibilityState?.disabled).toBe(false);
  });

  it('rejected: shows the review note', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      verification: { ...ROW, status: 'rejected', review_note: 'Plate not readable in the car photo.' },
    });
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('status-rejected')).toBeTruthy());
    expect(screen.getByTestId('status-rejected')).toHaveTextContent(/plate not readable/i);
  });

  it('approved: shows the approved banner', async () => {
    mockGet.mockResolvedValue({ ok: true, verification: { ...ROW, status: 'approved' } });
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('status-approved')).toBeTruthy());
  });

  it('a load error shows retry — never an empty first-time form', async () => {
    mockGet.mockResolvedValueOnce({ ok: false });
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('driver-verification-load-error')).toBeTruthy());
    mockGet.mockResolvedValue({ ok: true, verification: ROW });
    fireEvent.press(screen.getByTestId('driver-verification-retry'));
    await waitFor(() => expect(screen.getByTestId('status-pending')).toBeTruthy());
  });

  it('a failed submit surfaces the message and stays editable', async () => {
    mockSubmit.mockResolvedValue({ ok: false, message: 'Could not submit your driver verification. Please try again.' });
    render(<DriverVerificationScreen />);
    await waitFor(() => expect(screen.getByTestId('dv-make')).toBeTruthy());
    await fillFields();
    await addAllPhotos();
    await waitFor(() => expect(screen.getByTestId('dv-submit').props.accessibilityState?.disabled).toBe(false));
    fireEvent.press(screen.getByTestId('dv-submit'));
    await waitFor(() => expect(screen.getByTestId('dv-error')).toBeTruthy());
  });
});
