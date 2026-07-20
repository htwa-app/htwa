/**
 * __tests__/unit/DriverOnboardingScreen.test.tsx
 * Block 4i — driver onboarding: tax residence, engine cc, attestations, declaration.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockUpsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...args: unknown[]) => mockUpsert(...args) }) },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import DriverOnboardingScreen, { DECLARATION_VERSION } from '../../app/driver-onboarding';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockUpsert.mockResolvedValue({ error: null });
});

function completeForm() {
  fireEvent.press(screen.getByTestId('tax-ROI'));
  fireEvent.press(screen.getByTestId('engine-le1200'));
  fireEvent.press(screen.getByTestId('check-insurance'));
  fireEvent.press(screen.getByTestId('check-notify'));
  fireEvent.press(screen.getByTestId('check-declaration'));
}

describe('DriverOnboardingScreen', () => {
  it('renders the form', () => {
    render(<DriverOnboardingScreen />);
    expect(screen.getByTestId('driver-onboarding-screen')).toBeTruthy();
    expect(screen.getByTestId('declaration-text')).toBeTruthy();
  });

  it('keeps submit disabled until every required field is provided', () => {
    render(<DriverOnboardingScreen />);
    expect(screen.getByTestId('onboarding-submit').props.accessibilityState?.disabled).toBe(true);
    completeForm();
    expect(screen.getByTestId('onboarding-submit').props.accessibilityState?.disabled).toBe(false);
  });

  it('interpolates the jurisdiction into the placeholder declaration', () => {
    render(<DriverOnboardingScreen />);
    fireEvent.press(screen.getByTestId('tax-UK'));
    expect(screen.getByTestId('declaration-text')).toHaveTextContent(/resident for tax purposes in the UK/);
    expect(screen.getByTestId('declaration-text')).toHaveTextContent(/HMRC approved/);
    fireEvent.press(screen.getByTestId('tax-ROI'));
    expect(screen.getByTestId('declaration-text')).toHaveTextContent(/Revenue Civil Service/);
  });

  it('upserts with a versioned, timestamped declaration and navigates on success', async () => {
    render(<DriverOnboardingScreen />);
    completeForm();
    fireEvent.press(screen.getByTestId('onboarding-submit'));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const payload = mockUpsert.mock.calls[0][0];
    expect(payload).toMatchObject({
      user_id: 'u1',
      tax_residence: 'ROI',
      engine_cc: 'le1200',
      insurance_cert_confirmed: true,
      notify_insurer_confirmed: true,
      declaration_version: DECLARATION_VERSION,
    });
    expect(typeof payload.declaration_accepted_at).toBe('string');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('shows an error and does not navigate when the upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'boom' } });
    render(<DriverOnboardingScreen />);
    completeForm();
    fireEvent.press(screen.getByTestId('onboarding-submit'));
    await waitFor(() => expect(screen.getByTestId('onboarding-error')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
