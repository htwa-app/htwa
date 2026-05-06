/**
 * __tests__/unit/HomeScreen.test.tsx
 *
 * Unit tests for app/home.tsx (DESIGN-SPEC.md §9.2).
 *
 * Mocked modules:
 *   @expo/vector-icons — prevents native font-loading in Jest
 *   react-native-safe-area-context — standard RN test shim
 *
 * Architecture notes:
 *   - Route input lives inside the Card design-system component (padding:0 override)
 *   - Filter chips use the Chip design-system component (no onPress → View)
 *   - Search CTA uses the Button design-system component
 *   - Header avatar uses the Avatar design-system component (testID="header-avatar")
 *   - Safety grid uses Ionicons icons (mocked) + data-driven SAFETY_FEATURES array
 *   - "Upcoming for you" is a placeholder until ride data is wired (Stage 38)
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../app/home';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Ionicons requires native vector font loading — swap for a lightweight stub.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ testID }: { testID?: string }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement(require('react-native').View, { testID }),
}));

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('HomeScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<HomeScreen />)).not.toThrow();
  });
});

// ─── Branding ─────────────────────────────────────────────────────────────────

describe('HomeScreen — branding', () => {
  beforeEach(() => render(<HomeScreen />));

  it('displays the greeting header', () => {
    expect(screen.getByText('Hey Jordan 👋')).toBeTruthy();
  });

  it('displays the legal cost-share note', () => {
    expect(
      screen.getByText('Drivers share costs only — never profit from a journey.')
    ).toBeTruthy();
  });
});

// ─── Header avatar ────────────────────────────────────────────────────────────

describe('HomeScreen — header avatar', () => {
  it('renders the Avatar component with testID header-avatar', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('header-avatar')).toBeTruthy();
  });
});

// ─── Toggle tabs ──────────────────────────────────────────────────────────────

describe('HomeScreen — toggle tabs', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the Find a ride tab', () => {
    expect(screen.getByText('Find a ride')).toBeTruthy();
  });

  it('renders the Offer a ride tab', () => {
    expect(screen.getByText('Offer a ride')).toBeTruthy();
  });

  it('"Find a ride" tab is selected by default', () => {
    const tab = screen.getByRole('tab', { name: 'Find a ride' });
    expect(tab.props.accessibilityState?.selected).toBe(true);
  });

  it('"Offer a ride" tab is not selected by default', () => {
    const tab = screen.getByRole('tab', { name: 'Offer a ride' });
    expect(tab.props.accessibilityState?.selected).toBe(false);
  });

  it('tapping "Offer a ride" selects it', () => {
    fireEvent.press(screen.getByText('Offer a ride'));
    const offerTab = screen.getByRole('tab', { name: 'Offer a ride' });
    expect(offerTab.props.accessibilityState?.selected).toBe(true);
  });

  it('tapping "Offer a ride" deselects "Find a ride"', () => {
    fireEvent.press(screen.getByText('Offer a ride'));
    const findTab = screen.getByRole('tab', { name: 'Find a ride' });
    expect(findTab.props.accessibilityState?.selected).toBe(false);
  });

  it('tapping "Find a ride" after "Offer a ride" switches back', () => {
    fireEvent.press(screen.getByText('Offer a ride'));
    fireEvent.press(screen.getByText('Find a ride'));
    const findTab = screen.getByRole('tab', { name: 'Find a ride' });
    expect(findTab.props.accessibilityState?.selected).toBe(true);
  });
});

// ─── Route inputs ─────────────────────────────────────────────────────────────

describe('HomeScreen — route inputs', () => {
  it('renders the From input with correct placeholder', () => {
    render(<HomeScreen />);
    expect(
      screen.getByPlaceholderText('From — city, town or university')
    ).toBeTruthy();
  });

  it('renders the To input with correct placeholder', () => {
    render(<HomeScreen />);
    expect(
      screen.getByPlaceholderText('City, town or university…')
    ).toBeTruthy();
  });

  it('updates To value when user types into the destination field', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    fireEvent.changeText(input, 'Dublin');
    expect(input.props.value).toBe('Dublin');
  });

  it('clears To value when user deletes text', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    fireEvent.changeText(input, 'Cork');
    fireEvent.changeText(input, '');
    expect(input.props.value).toBe('');
  });

  it('swap button swaps origin and destination values', () => {
    render(<HomeScreen />);
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');

    fireEvent.changeText(fromInput, 'Dublin');
    fireEvent.changeText(toInput,   'Galway');
    fireEvent.press(screen.getByRole('button', { name: 'Swap origin and destination' }));

    expect(fromInput.props.value).toBe('Galway');
    expect(toInput.props.value).toBe('Dublin');
  });

  it('swap with empty fields leaves both empty', () => {
    render(<HomeScreen />);
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');

    fireEvent.press(screen.getByRole('button', { name: 'Swap origin and destination' }));

    expect(fromInput.props.value).toBe('');
    expect(toInput.props.value).toBe('');
  });
});

// ─── Filter chips ─────────────────────────────────────────────────────────────

describe('HomeScreen — filter chips', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the Today chip', () => {
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders the Any time chip', () => {
    expect(screen.getByText('Any time')).toBeTruthy();
  });

  it('renders the 1+ seats chip', () => {
    expect(screen.getByText('1+ seats')).toBeTruthy();
  });

  it('chips are display-only — no button role', () => {
    // Chips without onPress render as View, not TouchableOpacity — no button role
    const today = screen.getByText('Today').parent;
    expect(today?.props.accessibilityRole).not.toBe('button');
  });
});

// ─── Search CTA ───────────────────────────────────────────────────────────────

describe('HomeScreen — search CTA', () => {
  it('renders the Search rides button', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('button', { name: 'Search rides' })).toBeTruthy();
  });

  it('Search rides button fires without throwing', () => {
    render(<HomeScreen />);
    expect(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Search rides' }))
    ).not.toThrow();
  });
});

// ─── Safety section ───────────────────────────────────────────────────────────

describe('HomeScreen — safety section', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the "Built with you in mind" heading', () => {
    expect(screen.getByText('Built with you in mind')).toBeTruthy();
  });

  it('renders the Safety hub link text', () => {
    expect(screen.getByText('Safety hub →')).toBeTruthy();
  });

  it('renders the Share my journey card', () => {
    expect(screen.getByText('Share my journey')).toBeTruthy();
  });

  it('renders the Women-only mode card', () => {
    expect(screen.getByText('Women-only mode')).toBeTruthy();
  });

  it('renders the Verified IDs card', () => {
    expect(screen.getByText('Verified IDs')).toBeTruthy();
  });

  it('renders the In-app SOS card', () => {
    expect(screen.getByText('In-app SOS')).toBeTruthy();
  });

  it('renders all 4 safety card descriptions', () => {
    expect(screen.getByText('Live tracking for your trusted contacts')).toBeTruthy();
    expect(screen.getByText('Travel with verified women only')).toBeTruthy();
    expect(screen.getByText('Every account checked against a college email')).toBeTruthy();
    expect(screen.getByText('Silent alert sent to emergency contacts')).toBeTruthy();
  });

  it('each safety card has a testID', () => {
    expect(screen.getByTestId('safety-card-journey')).toBeTruthy();
    expect(screen.getByTestId('safety-card-women')).toBeTruthy();
    expect(screen.getByTestId('safety-card-verified')).toBeTruthy();
    expect(screen.getByTestId('safety-card-sos')).toBeTruthy();
  });
});

// ─── Women-only toggle ────────────────────────────────────────────────────────

describe('HomeScreen — women-only toggle', () => {
  it('renders the Switch on the Women-only card', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('women-only-switch')).toBeTruthy();
  });

  it('Switch is off by default', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('women-only-switch').props.value).toBe(false);
  });

  it('toggling Switch on changes its value to true', () => {
    render(<HomeScreen />);
    const toggle = screen.getByTestId('women-only-switch');
    fireEvent(toggle, 'valueChange', true);
    expect(screen.getByTestId('women-only-switch').props.value).toBe(true);
  });

  it('toggling Switch off after on changes its value back to false', () => {
    render(<HomeScreen />);
    const toggle = screen.getByTestId('women-only-switch');
    fireEvent(toggle, 'valueChange', true);
    fireEvent(toggle, 'valueChange', false);
    expect(screen.getByTestId('women-only-switch').props.value).toBe(false);
  });

  it('Switch has the correct accessibilityLabel', () => {
    render(<HomeScreen />);
    const toggle = screen.getByTestId('women-only-switch');
    expect(toggle.props.accessibilityLabel).toBe('Women-only mode toggle');
  });
});

// ─── Upcoming section ─────────────────────────────────────────────────────────

describe('HomeScreen — upcoming section', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the "Upcoming for you" heading', () => {
    expect(screen.getByText('Upcoming for you')).toBeTruthy();
  });

  it('renders the upcoming placeholder message', () => {
    expect(
      screen.getByText('Your upcoming rides will appear here.')
    ).toBeTruthy();
  });
});

// ─── Platform variants ────────────────────────────────────────────────────────

describe('HomeScreen — platform variants', () => {
  it('renders correctly on Android (exercises android paddingTop branch)', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
      writable: true,
    });
    try {
      expect(() => render(<HomeScreen />)).not.toThrow();
    } finally {
      Object.defineProperty(Platform, 'OS', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
