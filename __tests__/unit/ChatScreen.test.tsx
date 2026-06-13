/**
 * __tests__/unit/ChatScreen.test.tsx
 * Stage 53 — unit tests for app/chat/[booking_id].tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ booking_id: 'b1' }),
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

interface MockMessage { id: string; sender_id: string; content: string; created_at: string }

const mockOrder = jest.fn();
const mockInsert = jest.fn();
const mockSubscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
// .on() is chainable — the screen registers a message INSERT listener AND a
// booking chat_status UPDATE listener, so each .on() returns the same builder.
const mockChannelBuilder: { on: jest.Mock; subscribe: jest.Mock } = {
  on: jest.fn(() => mockChannelBuilder),
  subscribe: mockSubscribe,
};
const mockOn = mockChannelBuilder.on;
const mockChannel = jest.fn((_name: string) => mockChannelBuilder);
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: (arg?: unknown) => mockOrder(arg) }) }),
      insert: (arg: unknown) => mockInsert(arg),
    }),
    channel: (name: string) => mockChannel(name),
    removeChannel: jest.fn(),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

// Change 3 — chat lifecycle service (isolated; its own unit test covers logic).
const mockGetChatMeta = jest.fn();
const mockCloseChat = jest.fn();
jest.mock('../../services/chat', () => ({
  getChatMeta: (...a: unknown[]) => mockGetChatMeta(...a),
  closeChat: (...a: unknown[]) => mockCloseChat(...a),
  canCloseChat: (rideStatus: string | null) => rideStatus === 'completed',
}));

import { Alert } from 'react-native';
import ChatScreen from '../../app/chat/[booking_id]';

const MESSAGES: MockMessage[] = [
  { id: 'm1', sender_id: 'u1', content: 'On my way', created_at: '2026-06-01T09:00:00Z' },
  { id: 'm2', sender_id: 'd1', content: 'See you soon', created_at: '2026-06-01T09:01:00Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockOrder.mockResolvedValue({ data: MESSAGES, error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockGetChatMeta.mockResolvedValue({ chatStatus: 'open', rideStatus: 'active' });
  mockCloseChat.mockResolvedValue({ ok: true });
});

describe('ChatScreen', () => {
  it('loads and renders messages', async () => {
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('message-m1')).toBeTruthy());
    expect(screen.getByTestId('message-m2')).toBeTruthy();
  });

  it('subscribes to the realtime channel for the booking', async () => {
    render(<ChatScreen />);
    await waitFor(() => expect(mockChannel).toHaveBeenCalledWith('chat:b1'));
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('flips to read-only live when a chat_status UPDATE arrives (other party closed it)', async () => {
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('message-input')).toBeTruthy());
    // Find the bookings UPDATE listener registered via .on(config, cb) and fire it.
    // .on(event, config, cb) — find the bookings UPDATE registration.
    const updateCall = mockOn.mock.calls.find(
      ([, cfg]) => (cfg as { table?: string }).table === 'bookings',
    );
    expect(updateCall).toBeTruthy();
    const cb = updateCall![2] as (p: { new: { chat_status: string } }) => void;
    act(() => cb({ new: { chat_status: 'closed' } }));
    await waitFor(() => expect(screen.getByTestId('chat-closed-banner')).toBeTruthy());
    expect(screen.queryByTestId('message-input')).toBeNull();
  });

  it('sends a message and clears the input on success', async () => {
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('message-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('message-input'), 'Hello');
    fireEvent.press(screen.getByTestId('send-button'));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert).toHaveBeenCalledWith({ booking_id: 'b1', sender_id: 'u1', content: 'Hello' });
    await waitFor(() => expect(screen.getByTestId('message-input').props.value).toBe(''));
  });

  it('does not clear the input when the send fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'fail' } });
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('message-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('message-input'), 'Hello');
    fireEvent.press(screen.getByTestId('send-button'));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(screen.getByTestId('message-input').props.value).toBe('Hello');
  });

  it('shows the empty state when there are no messages', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('chat-empty')).toBeTruthy());
  });
});

describe('ChatScreen — Change 3 lifecycle', () => {
  it('hides the End chat button while the journey is not complete', async () => {
    mockGetChatMeta.mockResolvedValue({ chatStatus: 'open', rideStatus: 'active' });
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('message-input')).toBeTruthy());
    expect(screen.queryByTestId('end-chat-button')).toBeNull();
  });

  it('shows the End chat button once the journey is complete (chat still open)', async () => {
    mockGetChatMeta.mockResolvedValue({ chatStatus: 'open', rideStatus: 'completed' });
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('end-chat-button')).toBeTruthy());
  });

  it('is read-only when closed: input hidden, banner shown, history visible', async () => {
    mockGetChatMeta.mockResolvedValue({ chatStatus: 'closed', rideStatus: 'completed' });
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('chat-closed-banner')).toBeTruthy());
    expect(screen.queryByTestId('message-input')).toBeNull();
    expect(screen.queryByTestId('send-button')).toBeNull();
    expect(screen.getByTestId('message-m1')).toBeTruthy(); // history still readable
    expect(screen.queryByTestId('end-chat-button')).toBeNull(); // already closed
  });

  it('closes the chat via the End chat confirmation', async () => {
    mockGetChatMeta.mockResolvedValue({ chatStatus: 'open', rideStatus: 'completed' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      // press the destructive "End chat" button
      const endBtn = (buttons ?? []).find((b) => b.style === 'destructive');
      void endBtn?.onPress?.();
    });
    render(<ChatScreen />);
    await waitFor(() => expect(screen.getByTestId('end-chat-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('end-chat-button'));
    await waitFor(() => expect(mockCloseChat).toHaveBeenCalledWith('b1'));
    await waitFor(() => expect(screen.getByTestId('chat-closed-banner')).toBeTruthy());
    alertSpy.mockRestore();
  });
});
