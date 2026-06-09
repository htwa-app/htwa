/**
 * __tests__/unit/chatService.test.ts
 * Change 3 — chat lifecycle service.
 */
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn();
const mockRpc = jest.fn();
const mockMaybeSingle = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (arg: unknown) => { mockUpdate(arg); return { eq: mockUpdateEq }; },
      select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }),
    }),
    rpc: (name: string, args: unknown) => mockRpc(name, args),
  },
}));

import { acceptBooking, canCloseChat, closeChat, getChatMeta } from '../../services/chat';

beforeEach(() => jest.clearAllMocks());

describe('acceptBooking', () => {
  it('sets the booking status to confirmed', async () => {
    mockUpdateEq.mockResolvedValue({ error: null });
    const res = await acceptBooking('b1');
    expect(res.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'b1');
  });
  it('reports an error on failure', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'nope' } });
    expect((await acceptBooking('b1')).ok).toBe(false);
  });
});

describe('canCloseChat', () => {
  it('only allows closing once the journey is completed', () => {
    expect(canCloseChat('completed')).toBe(true);
    expect(canCloseChat('active')).toBe(false);
    expect(canCloseChat('full')).toBe(false);
    expect(canCloseChat('cancelled')).toBe(false);
    expect(canCloseChat(null)).toBe(false);
  });
});

describe('closeChat', () => {
  it('calls the close_chat RPC', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const res = await closeChat('b1');
    expect(res.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('close_chat', { p_booking_id: 'b1' });
  });
  it('surfaces the server gate error (e.g. journey_not_complete)', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'journey_not_complete' } });
    const res = await closeChat('b1');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('journey_not_complete');
  });
});

describe('getChatMeta', () => {
  it('returns chat + ride status', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { chat_status: 'closed', ride: { status: 'completed' } }, error: null });
    expect(await getChatMeta('b1')).toEqual({ chatStatus: 'closed', rideStatus: 'completed' });
  });
  it('returns null when the booking is missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getChatMeta('b1')).toBeNull();
  });
});
