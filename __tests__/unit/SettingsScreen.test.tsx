/**
 * __tests__/unit/SettingsScreen.test.tsx
 *
 * Smoke tests for app/settings.tsx (placeholder route).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

import SettingsScreen from '../../app/settings';

beforeEach(() => jest.clearAllMocks());

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
