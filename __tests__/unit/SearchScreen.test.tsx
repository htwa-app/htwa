/**
 * __tests__/unit/SearchScreen.test.tsx
 * Stage 33 — unit tests for app/(tabs)/index.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

// RouteInput mock — no inline type annotations in factory
jest.mock('../../components/RouteInput', () => {
  const { View, TextInput } = require('react-native');
  return {
    RouteInput: (props: Record<string, unknown>) => (
      <View testID={(props.testID as string) ?? 'route-input'}>
        <TextInput
          testID="from-input"
          value={(props.from as string) ?? ''}
          onChangeText={props.onFromChange}
        />
        <TextInput
          testID="to-input"
          value={(props.to as string) ?? ''}
          onChangeText={props.onToChange}
        />
      </View>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1', user_metadata: { full_name: 'Jordan Madden' } } });
});

import SearchScreen from '../../app/(tabs)/index';

describe('SearchScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<SearchScreen />)).not.toThrow();
  });

  it('shows the search screen testID', () => {
    render(<SearchScreen />);
    expect(screen.getByTestId('search-screen')).toBeTruthy();
  });
});

describe('SearchScreen — greeting', () => {
  it('shows a greeting with the user first name', () => {
    render(<SearchScreen />);
    expect(screen.getByText('Hey Jordan 👋')).toBeTruthy();
  });
});

describe('SearchScreen — mode toggle', () => {
  it('shows Find a ride and Offer a ride tabs', () => {
    render(<SearchScreen />);
    expect(screen.getByTestId('mode-find')).toBeTruthy();
    expect(screen.getByTestId('mode-offer')).toBeTruthy();
  });

  it('shows find mode content by default', () => {
    render(<SearchScreen />);
    expect(screen.getByTestId('find-mode-content')).toBeTruthy();
  });

  it('switches to offer mode when offer tab is pressed', () => {
    render(<SearchScreen />);
    fireEvent.press(screen.getByTestId('mode-offer'));
    expect(screen.getByTestId('offer-mode-content')).toBeTruthy();
  });

  it('switches back to find mode when find tab is pressed', () => {
    render(<SearchScreen />);
    fireEvent.press(screen.getByTestId('mode-offer'));
    fireEvent.press(screen.getByTestId('mode-find'));
    expect(screen.getByTestId('find-mode-content')).toBeTruthy();
  });
});

describe('SearchScreen — search button', () => {
  it('is disabled when from/to are empty', () => {
    render(<SearchScreen />);
    const btn = screen.getByTestId('search-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('is enabled when from and to are filled', () => {
    render(<SearchScreen />);
    fireEvent.changeText(screen.getByTestId('from-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Galway');
    const btn = screen.getByTestId('search-button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('navigates to search-results when search button pressed', async () => {
    render(<SearchScreen />);
    fireEvent.changeText(screen.getByTestId('from-input'), 'Dublin');
    fireEvent.changeText(screen.getByTestId('to-input'), 'Galway');
    fireEvent.press(screen.getByTestId('search-button'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(String(mockPush.mock.calls[0][0])).toContain('search-results');
  });
});

describe('SearchScreen — offer mode', () => {
  it('navigates to /offer-ride when post a ride is pressed', () => {
    render(<SearchScreen />);
    fireEvent.press(screen.getByTestId('mode-offer'));
    fireEvent.press(screen.getByTestId('post-ride-button'));
    expect(mockPush).toHaveBeenCalledWith('/offer-ride');
  });
});
