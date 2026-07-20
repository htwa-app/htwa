/**
 * app/(tabs)/_layout.tsx
 *
 * Tabs navigator for the four main app screens per DESIGN-SPEC.md §6.8.
 * Splash screen and auth screens live in the parent Stack (app/_layout.tsx)
 * so they never show the tab bar.
 *
 * Exported constants allow unit tests to assert token values without
 * rendering the full navigator.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** DESIGN-SPEC §6.8 — inactive icon/label colour; not in §1 brand palette */
export const TAB_INACTIVE_COLOR = 'rgba(40,30,20,0.40)';

/** DESIGN-SPEC §6.8 — top border on the tab bar; not in §1 brand palette */
export const TAB_BORDER_COLOR = 'rgba(40,30,20,0.08)';

// ─── Screen definitions ───────────────────────────────────────────────────────

/** All four tab screens in display order. Exported for test assertions. */
export const TAB_SCREENS = [
  {
    name:        'index',
    title:       'Search',
    icon:        'search'         as const,
    outlineIcon: 'search-outline' as const,
  },
  {
    name:        'history',
    title:       'History',
    icon:        'time'         as const,
    outlineIcon: 'time-outline' as const,
  },
  {
    name:        'live-trip',
    title:       'Live Trip',
    icon:        'navigate'         as const,
    outlineIcon: 'navigate-outline' as const,
  },
  {
    name:        'profile',
    title:       'Profile',
    icon:        'person'         as const,
    outlineIcon: 'person-outline' as const,
  },
] as const;

// ─── Shared screen options ────────────────────────────────────────────────────

/** Exported so tests can assert token values without rendering the navigator. */
export const TAB_SCREEN_OPTIONS = {
  headerShown:           false,
  tabBarActiveTintColor:   Colors.primary,
  tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
  tabBarStyle: {
    backgroundColor: Colors.surface,
    borderTopWidth:  1,
    borderTopColor:  TAB_BORDER_COLOR,
    height:          Spacing.tabBarHeight, // 60 px per §6.8
  },
} as const;

// ─── Navigator ────────────────────────────────────────────────────────────────

export default function TabLayout(): React.ReactElement {
  // In-app notification triggers (booking requests/decisions, safety alerts)
  // — local delivery until APNs/FCM land (BLOCKERS-FOR-JORDAN.md).
  useRealtimeNotifications();
  return (
    <Tabs screenOptions={TAB_SCREEN_OPTIONS}>
      {TAB_SCREENS.map(({ name, title, icon, outlineIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? icon : outlineIcon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
