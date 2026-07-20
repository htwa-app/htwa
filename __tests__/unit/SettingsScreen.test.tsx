/**
 * __tests__/unit/SettingsScreen.test.tsx
 *
 * Smoke tests for app/settings.tsx (placeholder route).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

// Mock the dev-reset helper (also keeps the real lib/supabase out of this test).
const mockDevReset = jest.fn();
jest.mock('../../utils/devReset', () => ({
  devResetAndSignOut: (...a: unknown[]) => mockDevReset(...a),
}));

import SettingsScreen from '../../app/settings';

beforeEach(() => {
  jest.clearAllMocks();
  mockDevReset.mockResolvedValue(undefined);
});

describe('SettingsScreen', () => {
  it('renders without crashing', () => {
    expect(() => render(<SettingsScreen />)).not.toThrow();
    expect(screen.getByTestId('settings-screen')).toBeTruthy();
  });

  it('shows the coming-soon message', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings are coming soon.')).toBeTruthy();
  });

  it('navigates back when the back button is pressed', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsScreen — dev reset (__DEV__)', () => {
  // __DEV__ is true under Jest, so the dev tools render here.
  it('shows the dev reset control in development', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('dev-reset-button')).toBeTruthy();
  });

  it('resets, signs out, and returns to the login screen on success', async () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('dev-reset-button'));
    await waitFor(() => expect(mockDevReset).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByTestId('dev-reset-error')).toBeNull();
  });

  it('surfaces an error and does NOT navigate when the reset fails', async () => {
    mockDevReset.mockRejectedValue(new Error('sign-out failed'));
    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('dev-reset-button'));
    await waitFor(() => expect(screen.getByTestId('dev-reset-error')).toHaveTextContent('sign-out failed'));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
