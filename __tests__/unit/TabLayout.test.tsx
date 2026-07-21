/**
 * __tests__/unit/TabLayout.test.tsx
 *
 * Unit tests for app/(tabs)/_layout.tsx.
 *
 * Strategy: mock expo-router's Tabs + Tabs.Screen and @expo/vector-icons so
 * this suite never touches native modules.  Assertions target the exported
 * constants (TAB_SCREENS, TAB_SCREEN_OPTIONS, TAB_INACTIVE_COLOR,
 * TAB_BORDER_COLOR) and the rendered screen count rather than the internals
 * of the navigator — keeping the tests fast and deterministic.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabLayout, {
  TAB_SCREENS,
  TAB_SCREEN_OPTIONS,
  TAB_INACTIVE_COLOR,
  TAB_BORDER_COLOR,
} from '../../app/(tabs)/_layout';
import { Colors, Spacing } from '../../constants/theme';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// expo-router mock — jest.mock is hoisted before variable declarations, so
// everything must be defined *inside* the factory using require().
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  function MockScreen({ name }: { name: string }) {
    return React.createElement(View, { testID: `tab-screen-${name}` });
  }

  // Typed as any so we can attach .Screen without a full interface declaration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockTabs: any = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'tabs-navigator' }, children);
  MockTabs.Screen = MockScreen;

  return { Tabs: MockTabs };
});

// Ionicons mock — renders nothing (we're not testing icon visuals here)
jest.mock('../../hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => undefined,
}));

// Both hooks call useAuth() internally, which throws outside an AuthProvider —
// this test renders the bare navigator, so both are stubbed the same way.
jest.mock('../../hooks/usePushTokenRegistration', () => ({
  usePushTokenRegistration: () => undefined,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// ─── Exported constants ───────────────────────────────────────────────────────

describe('TabLayout — exported constants', () => {
  describe('TAB_INACTIVE_COLOR', () => {
    it('is the spec §6.8 inactive colour', () => {
      expect(TAB_INACTIVE_COLOR).toBe('rgba(40,30,20,0.40)');
    });

    it('is NOT the primary brand colour (inactive tabs must look different)', () => {
      expect(TAB_INACTIVE_COLOR).not.toBe(Colors.primary);
    });
  });

  describe('TAB_BORDER_COLOR', () => {
    it('is the spec §6.8 tab bar top-border colour', () => {
      expect(TAB_BORDER_COLOR).toBe('rgba(40,30,20,0.08)');
    });
  });

  describe('TAB_SCREEN_OPTIONS', () => {
    it('hides the header on all tab screens', () => {
      expect(TAB_SCREEN_OPTIONS.headerShown).toBe(false);
    });

    it('uses Colors.primary as the active tint colour', () => {
      expect(TAB_SCREEN_OPTIONS.tabBarActiveTintColor).toBe(Colors.primary);
    });

    it('uses TAB_INACTIVE_COLOR as the inactive tint colour', () => {
      expect(TAB_SCREEN_OPTIONS.tabBarInactiveTintColor).toBe(TAB_INACTIVE_COLOR);
    });

    it('tab bar background is Colors.surface', () => {
      expect(TAB_SCREEN_OPTIONS.tabBarStyle.backgroundColor).toBe(Colors.surface);
    });

    it('tab bar height is Spacing.tabBarHeight (60 px)', () => {
      expect(TAB_SCREEN_OPTIONS.tabBarStyle.height).toBe(Spacing.tabBarHeight);
      expect(Spacing.tabBarHeight).toBe(60);
    });

    it('tab bar top border width is 1', () => {
      expect(TAB_SCREEN_OPTIONS.tabBarStyle.borderTopWidth).toBe(1);
    });

    it('tab bar top border colour is TAB_BORDER_COLOR', () => {
      expect(TAB_SCREEN_OPTIONS.tabBarStyle.borderTopColor).toBe(TAB_BORDER_COLOR);
    });
  });

  describe('TAB_SCREENS', () => {
    it('defines exactly 4 tabs', () => {
      expect(TAB_SCREENS).toHaveLength(4);
    });

    it('first tab is the index (Search) tab', () => {
      expect(TAB_SCREENS[0].name).toBe('index');
      expect(TAB_SCREENS[0].title).toBe('Search');
    });

    it('second tab is the history tab', () => {
      expect(TAB_SCREENS[1].name).toBe('history');
      expect(TAB_SCREENS[1].title).toBe('History');
    });

    it('third tab is the live-trip tab', () => {
      expect(TAB_SCREENS[2].name).toBe('live-trip');
      expect(TAB_SCREENS[2].title).toBe('Live Trip');
    });

    it('fourth tab is the profile tab', () => {
      expect(TAB_SCREENS[3].name).toBe('profile');
      expect(TAB_SCREENS[3].title).toBe('Profile');
    });

    it('every tab has a filled icon name', () => {
      TAB_SCREENS.forEach(tab => {
        expect(typeof tab.icon).toBe('string');
        expect(tab.icon.length).toBeGreaterThan(0);
      });
    });

    it('every tab has a separate outline icon for the inactive state', () => {
      TAB_SCREENS.forEach(tab => {
        expect(typeof tab.outlineIcon).toBe('string');
        expect(tab.outlineIcon).toContain('-outline');
      });
    });

    it('filled and outline icons are different for each tab', () => {
      TAB_SCREENS.forEach(tab => {
        expect(tab.icon).not.toBe(tab.outlineIcon);
      });
    });

    it('Search tab (index) uses search / search-outline icons', () => {
      expect(TAB_SCREENS[0].icon).toBe('search');
      expect(TAB_SCREENS[0].outlineIcon).toBe('search-outline');
    });

    it('History tab uses time / time-outline icons', () => {
      expect(TAB_SCREENS[1].icon).toBe('time');
      expect(TAB_SCREENS[1].outlineIcon).toBe('time-outline');
    });

    it('Live Trip tab uses navigate / navigate-outline icons', () => {
      expect(TAB_SCREENS[2].icon).toBe('navigate');
      expect(TAB_SCREENS[2].outlineIcon).toBe('navigate-outline');
    });

    it('Profile tab uses person / person-outline icons', () => {
      expect(TAB_SCREENS[3].icon).toBe('person');
      expect(TAB_SCREENS[3].outlineIcon).toBe('person-outline');
    });
  });
});

// ─── Rendered output ──────────────────────────────────────────────────────────

describe('TabLayout — rendered output', () => {
  beforeEach(() => {
    render(<TabLayout />);
  });

  it('renders without crashing', () => {
    expect(screen.getByTestId('tabs-navigator')).toBeTruthy();
  });

  it('renders all 4 tab screens', () => {
    expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-history')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-live-trip')).toBeTruthy();
    expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
  });

  it('renders exactly 4 tab screens (no extras)', () => {
    const allScreens = screen.queryAllByTestId(/^tab-screen-/);
    expect(allScreens).toHaveLength(4);
  });
});
