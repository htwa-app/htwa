/**
 * __tests__/unit/usePushTokenRegistration.test.tsx
 *
 * Registers the device's Expo push token and persists it to the user's
 * profile once signed in — see services/notifications.ts (send-push
 * Edge Function reads it back to deliver backgrounded/killed-app pushes).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockRegister = jest.fn();
const mockSaveToken = jest.fn();
jest.mock('../../services/notifications', () => ({
  registerForPushNotifications: (...a: unknown[]) => mockRegister(...a),
  savePushToken: (...a: unknown[]) => mockSaveToken(...a),
}));

import { usePushTokenRegistration } from '../../hooks/usePushTokenRegistration';

function TestHost(): React.ReactElement {
  usePushTokenRegistration();
  return null as unknown as React.ReactElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveToken.mockResolvedValue(undefined);
});

describe('usePushTokenRegistration', () => {
  it('registers and persists the token when signed in', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockRegister.mockResolvedValue('ExponentPushToken[xxx]');
    render(<TestHost />);
    await waitFor(() => expect(mockSaveToken).toHaveBeenCalledWith('u1', 'ExponentPushToken[xxx]'));
  });

  it('does nothing when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<TestHost />);
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it('does not persist when no token is available (denied permission / simulator)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockRegister.mockResolvedValue(null);
    render(<TestHost />);
    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it('logs, does not throw, when registration itself rejects', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockRegister.mockRejectedValue(new Error('permission API unavailable'));
    render(<TestHost />);
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(mockSaveToken).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
