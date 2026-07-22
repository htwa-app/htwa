/**
 * __tests__/unit/useRealtimeNotifications.test.tsx
 *
 * Regression tests for the tab-navigator crash: "cannot add postgres_changes
 * callbacks after subscribe()". The mock mirrors supabase-js's real behaviour
 * — channel(name) returns the EXISTING instance for a name that hasn't
 * finished tearing down, and .on() after .subscribe() throws — so a
 * double-subscribe bug fails these tests the way it crashed the app.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// ── supabase mock with realtime-js semantics ─────────────────────────────────

interface MockChannel {
  name: string;
  subscribed: boolean;
  removed: boolean;
  on: (...args: unknown[]) => MockChannel;
  subscribe: () => MockChannel;
}

const mockChannelRegistry = new Map<string, MockChannel>();
const mockRemovedChannels: string[] = [];

function mockMakeChannel(name: string): MockChannel {
  const channel: MockChannel = {
    name,
    subscribed: false,
    removed: false,
    on: (..._args: unknown[]) => {
      if (channel.subscribed) {
        // Exactly what realtime-js throws — the crash under test.
        throw new Error(`tried to add postgres_changes callbacks for ${name} after subscribe()`);
      }
      return channel;
    },
    subscribe: () => { channel.subscribed = true; return channel; },
  };
  return channel;
}

jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: (name: string) => {
      // Real client behaviour: same name + not yet removed → SAME instance.
      const existing = mockChannelRegistry.get(name);
      if (existing && !existing.removed) return existing;
      const fresh = mockMakeChannel(name);
      mockChannelRegistry.set(name, fresh);
      return fresh;
    },
    removeChannel: (channel: MockChannel) => {
      // Async in the real client — the instance lingers until this resolves.
      return new Promise((resolve) => {
        setTimeout(() => {
          channel.removed = true;
          mockRemovedChannels.push(channel.name);
          resolve('ok');
        }, 0);
      });
    },
    from: () => {
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.in = () => builder;
      builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
      builder.then = (resolve: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
      return builder;
    },
  },
}));

jest.mock('../../services/notifications', () => ({
  notifyBookingRequest: jest.fn(),
  notifyBookingAccepted: jest.fn(),
  notifyBookingDeclined: jest.fn(),
  sendNotification: jest.fn(),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

function Harness(): null {
  useRealtimeNotifications();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChannelRegistry.clear();
  mockRemovedChannels.length = 0;
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
});

describe('useRealtimeNotifications — channel lifecycle', () => {
  it('subscribes exactly one channel on mount and removes it on unmount', async () => {
    const { unmount } = render(<Harness />);
    expect([...mockChannelRegistry.values()].filter((c) => c.subscribed)).toHaveLength(1);
    unmount();
    await new Promise((r) => setTimeout(r, 5));
    expect(mockRemovedChannels).toHaveLength(1);
  });

  it('REGRESSION: instant remount (before async removal completes) must not throw', async () => {
    // The old code used a stable name — channel() returned the still-subscribed
    // instance and .on() threw, crashing the tab navigator.
    const first = render(<Harness />);
    first.unmount();
    // No timer flush: removal hasn't completed, mimicking Fast Refresh.
    expect(() => render(<Harness />)).not.toThrow();
    const subscribed = [...mockChannelRegistry.values()].filter((c) => c.subscribed && !c.removed);
    expect(subscribed.length).toBeGreaterThanOrEqual(1);
  });

  it('rapid remount cycles never reuse a subscribed channel instance', () => {
    for (let i = 0; i < 5; i++) {
      const r = render(<Harness />);
      r.unmount();
    }
    expect(() => render(<Harness />)).not.toThrow();
    // Every mount created its own channel instance.
    expect(mockChannelRegistry.size).toBe(6);
  });

  it('switching accounts tears down the old channel and subscribes a fresh one', async () => {
    const { rerender, unmount } = render(<Harness />);
    mockUseAuth.mockReturnValue({ user: { id: 'u2' } });
    expect(() => rerender(<Harness />)).not.toThrow();
    await new Promise((r) => setTimeout(r, 5));

    const names = [...mockChannelRegistry.keys()];
    expect(names.some((n) => n.startsWith('user-notifications:u1:'))).toBe(true);
    expect(names.some((n) => n.startsWith('user-notifications:u2:'))).toBe(true);
    // u1's channel was removed; u2's is live.
    expect(mockRemovedChannels.some((n) => n.startsWith('user-notifications:u1:'))).toBe(true);
    const live = [...mockChannelRegistry.values()].filter((c) => c.subscribed && !c.removed);
    expect(live).toHaveLength(1);
    expect(live[0].name.startsWith('user-notifications:u2:')).toBe(true);
    unmount();
  });

  it('signed-out user subscribes nothing', () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<Harness />);
    expect(mockChannelRegistry.size).toBe(0);
  });
});
