/**
 * __tests__/unit/CompleteAccountScreen.test.tsx
 * First social sign-in → collect the profile fields email signup collects, write
 * the public.users row, then continue to mandatory ID verification.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUpsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...a: unknown[]) => mockUpsert(...a) }) },
}));

const mockDestination = jest.fn();
jest.mock('../../services/socialAuth', () => ({
  getDestinationAfterSocialSignIn: (...a: unknown[]) => mockDestination(...a),
}));

const mockSignOut = jest.fn();
jest.mock('../../utils/signOut', () => ({ signOutAndClear: (...a: unknown[]) => mockSignOut(...a) }));

import CompleteAccountScreen from '../../app/complete-account';

function fillValid() {
  fireEvent.changeText(screen.getByTestId('ca-full-name'), 'Aoife Kelly');
  fireEvent.changeText(screen.getByTestId('ca-phone'), '+353 87 123 4567');
  fireEvent.press(screen.getByTestId('ca-location-ROI'));
  fireEvent.press(screen.getByTestId('ca-gender-female'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'a@x.ie' }, isLoading: false });
  mockUpsert.mockResolvedValue({ error: null });
  mockDestination.mockResolvedValue({ ok: true, destination: '/id-verify' });
  mockSignOut.mockResolvedValue(undefined);
});

describe('CompleteAccountScreen', () => {
  it('prefills the name from the provider (Apple/Google) and stays editable', () => {
    mockParams = { name: 'Cian Murphy' };
    render(<CompleteAccountScreen />);
    expect(screen.getByTestId('ca-full-name').props.value).toBe('Cian Murphy');
  });

  it('Continue stays disabled until name, phone, location AND gender are all set', () => {
    render(<CompleteAccountScreen />);
    expect(screen.getByTestId('ca-continue').props.accessibilityState?.disabled).toBe(true);
    fillValid();
    expect(screen.getByTestId('ca-continue').props.accessibilityState?.disabled).toBe(false);
  });

  it('writes the public.users row (currency from home location) then continues to ID verification', async () => {
    render(<CompleteAccountScreen />);
    fillValid();
    fireEvent.press(screen.getByTestId('ca-continue'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/id-verify'));
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'u1', email: 'a@x.ie', phone: '+353 87 123 4567', full_name: 'Aoife Kelly', home_location: 'ROI', currency: 'EUR', gender: 'female' },
      { onConflict: 'id' },
    );
    expect(mockDestination).toHaveBeenCalledWith('u1');
  });

  it('NI → GBP', async () => {
    render(<CompleteAccountScreen />);
    fillValid();
    fireEvent.press(screen.getByTestId('ca-location-NI'));
    fireEvent.press(screen.getByTestId('ca-continue'));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert.mock.calls[0][0]).toMatchObject({ home_location: 'NI', currency: 'GBP' });
  });

  it('a failed upsert shows a friendly error (raw message not shown), does not navigate, and re-enables the button', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpsert.mockResolvedValue({ error: { message: 'duplicate key value violates unique constraint users_pkey' } });
    render(<CompleteAccountScreen />);
    fillValid();
    fireEvent.press(screen.getByTestId('ca-continue'));
    await waitFor(() => expect(screen.getByTestId('ca-error')).toBeTruthy());
    expect(screen.getByTestId('ca-error')).not.toHaveTextContent(/duplicate key/);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('ca-continue').props.accessibilityState?.disabled).toBe(false);
    spy.mockRestore();
  });

  it('a thrown upsert also resets the button and shows the error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpsert.mockRejectedValue(new Error('network'));
    render(<CompleteAccountScreen />);
    fillValid();
    fireEvent.press(screen.getByTestId('ca-continue'));
    await waitFor(() => expect(screen.getByTestId('ca-error')).toBeTruthy());
    expect(screen.getByTestId('ca-continue').props.accessibilityState?.disabled).toBe(false);
    spy.mockRestore();
  });

  it('row saved but the "what next" lookup fails → retryable error, no guessed destination', async () => {
    mockDestination.mockResolvedValue({ ok: false });
    render(<CompleteAccountScreen />);
    fillValid();
    fireEvent.press(screen.getByTestId('ca-continue'));
    await waitFor(() => expect(screen.getByTestId('ca-error')).toHaveTextContent(/saved/));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('no email on the auth user (e.g. a provider that withheld it) → clear error, nothing written', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', email: null }, isLoading: false });
    render(<CompleteAccountScreen />);
    fillValid();
    fireEvent.press(screen.getByTestId('ca-continue'));
    await waitFor(() => expect(screen.getByTestId('ca-error')).toBeTruthy());
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('not signed in → bounced to /login', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<CompleteAccountScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('"Use a different account" signs out and returns to /login', async () => {
    render(<CompleteAccountScreen />);
    fireEvent.press(screen.getByTestId('ca-sign-out'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockSignOut).toHaveBeenCalled();
  });
});
