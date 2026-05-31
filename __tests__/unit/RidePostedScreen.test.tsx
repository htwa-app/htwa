/**
 * __tests__/unit/RidePostedScreen.test.tsx
 * Stage 32b — smoke tests for app/ride-posted.tsx
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

import RidePostedScreen from '../../app/ride-posted';

beforeEach(() => jest.clearAllMocks());

describe('RidePostedScreen', () => {
  it('renders the confirmation', () => {
    render(<RidePostedScreen />);
    expect(screen.getByTestId('ride-posted-screen')).toBeTruthy();
    expect(screen.getByText('Ride posted!')).toBeTruthy();
  });

  it('navigates to my rides', () => {
    render(<RidePostedScreen />);
    fireEvent.press(screen.getByTestId('view-rides-button'));
    expect(mockReplace).toHaveBeenCalledWith('/my-rides');
  });

  it('navigates back to search', () => {
    render(<RidePostedScreen />);
    fireEvent.press(screen.getByTestId('back-to-search-button'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
