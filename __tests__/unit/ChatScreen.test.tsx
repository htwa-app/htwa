/**
 * __tests__/unit/ChatScreen.test.tsx
 * Stage 53 — unit tests for app/chat/[booking_id].tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

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
const mockOn = jest.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = jest.fn((_name: string) => ({ on: mockOn }));
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
