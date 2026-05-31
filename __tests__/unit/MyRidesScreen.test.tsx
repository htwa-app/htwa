/**
 * __tests__/unit/MyRidesScreen.test.tsx
 *
 * Smoke tests for app/my-rides.tsx (placeholder route until Phase 6).
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

import MyRidesScreen from '../../app/my-rides';

beforeEach(() => jest.clearAllMocks());

describe('MyRidesScreen', () => {
  it('renders without crashing', () => {
    expect(() => render(<MyRidesScreen />)).not.toThrow();
    expect(screen.getByTestId('my-rides-screen')).toBeTruthy();
  });

  it('shows the placeholder message', () => {
    render(<MyRidesScreen />);
    expect(screen.getByText('Your rides will appear here.')).toBeTruthy();
  });

  it('navigates back when the back button is pressed', () => {
    render(<MyRidesScreen />);
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
