/**
 * __tests__/unit/bookings.test.ts
 * Stage 45 — unit tests for services/bookings.ts
 */

// Chainable per-table mock builders so cancelRideAsDriver / cancelBookingAsPassenger
// can be tested against realistic (data, error) shapes, including zero-row updates.
// Each builder supports repeated .eq()/.in() chaining AND being awaited directly
// (no trailing .select()) via a thenable, matching how the real Postgrest
// query builder works.
const mockRideCancelSelect = jest.fn();  // cancelRideAsDriver: ride update ...select('id')
const mockBookingsBulkCancel = jest.fn(); // cancelRideAsDriver: bookings bulk update (no select)
const mockBookingCancelSelect = jest.fn(); // cancelBookingAsPassenger: booking update ...select(...)
const mockRideSingle = jest.fn();         // cancelBookingAsPassenger: ride read ...single()
const mockRideRestoreUpdate = jest.fn();  // cancelBookingAsPassenger: seat-restore update (no select)

jest.mock('../../lib/supabase', () => {
  function ridesUpdateBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {
      eq: () => builder,
      select: () => mockRideCancelSelect(),
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        mockRideRestoreUpdate().then(resolve, reject),
    };
    return builder;
  }

  function bookingsUpdateBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {
      eq: () => builder,
      in: () => builder,
      select: () => mockBookingCancelSelect(),
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        mockBookingsBulkCancel().then(resolve, reject),
    };
    return builder;
  }

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'rides') {
          return {
            update: () => ridesUpdateBuilder(),
            select: () => ({ eq: () => ({ single: () => mockRideSingle() }) }),
          };
        }
        return { update: () => bookingsUpdateBuilder() }; // table === 'bookings'
      },
      rpc: jest.fn(),
    },
  };
});

import { isFullRefundEligible, cancelRideAsDriver, cancelBookingAsPassenger, declineBooking } from '../../services/bookings';

beforeEach(() => jest.clearAllMocks());

describe('isFullRefundEligible', () => {
  it('returns true when > 24h before departure', () => {
    const dep = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(true);
  });

  it('returns false when < 24h before departure', () => {
    const dep = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns false when exactly 24h (boundary — not strictly greater)', () => {
    const dep = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns false when departure is in the past', () => {
    const dep = new Date(Date.now() - 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns true when 48h before departure', () => {
    const dep = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(true);
  });

  it('uses a custom cancelledAt reference date', () => {
    const dep        = new Date('2026-07-01T12:00:00Z').toISOString();
    const earlyCancel = new Date('2026-06-29T10:00:00Z'); // > 24h before
    const lateCancel  = new Date('2026-07-01T00:00:00Z'); // < 24h before
    expect(isFullRefundEligible(dep, earlyCancel)).toBe(true);
    expect(isFullRefundEligible(dep, lateCancel)).toBe(false);
  });

  it('returns false 30 minutes before departure', () => {
    const dep = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns true 3 days before departure', () => {
    const dep = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(true);
  });
});

describe('cancelRideAsDriver', () => {
  it('cancels the ride and its bookings on success', async () => {
    mockRideCancelSelect.mockResolvedValue({ data: [{ id: 'r1' }], error: null });
    mockBookingsBulkCancel.mockResolvedValue({ error: null });
    const res = await cancelRideAsDriver('r1', 'd1');
    expect(res).toEqual({
      success: true,
      refunded: true,
      message: 'Ride cancelled. All passengers will receive a full refund.',
    });
  });

  it('fails when the ride update query errors', async () => {
    mockRideCancelSelect.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const res = await cancelRideAsDriver('r1', 'd1');
    expect(res).toEqual({ success: false, refunded: false, message: 'db down' });
  });

  it('fails (does not report success) when zero rows are updated — wrong id or not the driver', async () => {
    mockRideCancelSelect.mockResolvedValue({ data: [], error: null });
    const res = await cancelRideAsDriver('r1', 'not-the-driver');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/not found|permitted/i);
  });

  it('fails when the ride is cancelled but the bookings bulk-update errors', async () => {
    mockRideCancelSelect.mockResolvedValue({ data: [{ id: 'r1' }], error: null });
    mockBookingsBulkCancel.mockResolvedValue({ error: { message: 'bookings update failed' } });
    const res = await cancelRideAsDriver('r1', 'd1');
    expect(res).toEqual({ success: false, refunded: false, message: 'bookings update failed' });
  });

  it('catches a thrown exception', async () => {
    mockRideCancelSelect.mockRejectedValue(new Error('network error'));
    const res = await cancelRideAsDriver('r1', 'd1');
    expect(res.success).toBe(false);
    expect(res.message).toBe('network error');
  });
});

describe('cancelBookingAsPassenger', () => {
  const futureDeparture = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  it('cancels the booking and restores seats on success (full refund eligible)', async () => {
    mockBookingCancelSelect.mockResolvedValue({
      data: [{ seats_booked: 2, ride_id: 'r1' }],
      error: null,
    });
    mockRideSingle.mockResolvedValue({
      data: { seats_available: 1, seats_total: 4, status: 'full' },
      error: null,
    });
    mockRideRestoreUpdate.mockResolvedValue({ error: null });

    const res = await cancelBookingAsPassenger('b1', 'p1', futureDeparture);
    expect(res).toEqual({
      success: true,
      refunded: true,
      message: 'Booking cancelled. Full refund issued within 3–5 business days.',
    });
  });

  it('fails when the booking update query errors', async () => {
    mockBookingCancelSelect.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const res = await cancelBookingAsPassenger('b1', 'p1', futureDeparture);
    expect(res).toEqual({ success: false, refunded: false, message: 'db down' });
  });

  it('fails (does not report success) when zero rows are updated — wrong id or not the passenger', async () => {
    mockBookingCancelSelect.mockResolvedValue({ data: [], error: null });
    const res = await cancelBookingAsPassenger('b1', 'not-the-passenger', futureDeparture);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/not found|permitted/i);
  });

  it('still reports the cancellation as successful if the seat-restore read fails (logs, does not fail the user-facing result)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockBookingCancelSelect.mockResolvedValue({
      data: [{ seats_booked: 1, ride_id: 'r1' }],
      error: null,
    });
    mockRideSingle.mockResolvedValue({ data: null, error: { message: 'ride read failed' } });

    const res = await cancelBookingAsPassenger('b1', 'p1', futureDeparture);
    expect(res.success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Bookings]'),
      'ride read failed',
    );
    errorSpy.mockRestore();
  });

  it('still reports the cancellation as successful if the seat-restore update fails (logs, does not fail the user-facing result)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockBookingCancelSelect.mockResolvedValue({
      data: [{ seats_booked: 1, ride_id: 'r1' }],
      error: null,
    });
    mockRideSingle.mockResolvedValue({
      data: { seats_available: 2, seats_total: 4, status: 'active' },
      error: null,
    });
    mockRideRestoreUpdate.mockResolvedValue({ error: { message: 'seat update failed' } });

    const res = await cancelBookingAsPassenger('b1', 'p1', futureDeparture);
    expect(res.success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Bookings]'),
      'seat update failed',
    );
    errorSpy.mockRestore();
  });

  it('reports no refund when cancelling within 24h of departure', async () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    mockBookingCancelSelect.mockResolvedValue({
      data: [{ seats_booked: 1, ride_id: 'r1' }],
      error: null,
    });
    mockRideSingle.mockResolvedValue({
      data: { seats_available: 0, seats_total: 4, status: 'full' },
      error: null,
    });
    mockRideRestoreUpdate.mockResolvedValue({ error: null });

    const res = await cancelBookingAsPassenger('b1', 'p1', soon);
    expect(res).toEqual({
      success: true,
      refunded: false,
      message: 'Booking cancelled. No refund applies within 24h of departure.',
    });
  });

  it('catches a thrown exception', async () => {
    mockBookingCancelSelect.mockRejectedValue(new Error('network error'));
    const res = await cancelBookingAsPassenger('b1', 'p1', futureDeparture);
    expect(res.success).toBe(false);
    expect(res.message).toBe('network error');
  });
});

describe('declineBooking', () => {
  it('declines the booking and restores the seat on success', async () => {
    mockBookingCancelSelect.mockResolvedValue({
      data: [{ seats_booked: 1, ride_id: 'r1' }],
      error: null,
    });
    mockRideSingle.mockResolvedValue({
      data: { seats_available: 0, seats_total: 4, status: 'full' },
      error: null,
    });
    mockRideRestoreUpdate.mockResolvedValue({ error: null });

    const res = await declineBooking('b1');
    expect(res).toEqual({ ok: true });
  });

  it('fails when the update query errors', async () => {
    mockBookingCancelSelect.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const res = await declineBooking('b1');
    expect(res).toEqual({ ok: false, error: 'db down' });
  });

  it('fails (does not report success) when zero rows are updated — not found, not permitted, or already decided', async () => {
    mockBookingCancelSelect.mockResolvedValue({ data: [], error: null });
    const res = await declineBooking('b1');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/not found|permitted|decided/i);
  });

  it('still reports success if the seat-restore fails (logs, does not fail the user-facing result)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockBookingCancelSelect.mockResolvedValue({
      data: [{ seats_booked: 1, ride_id: 'r1' }],
      error: null,
    });
    mockRideSingle.mockResolvedValue({ data: null, error: { message: 'ride read failed' } });

    const res = await declineBooking('b1');
    expect(res).toEqual({ ok: true });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[Bookings]'), 'ride read failed');
    errorSpy.mockRestore();
  });

  it('catches a thrown exception', async () => {
    mockBookingCancelSelect.mockRejectedValue(new Error('network error'));
    const res = await declineBooking('b1');
    expect(res).toEqual({ ok: false, error: 'network error' });
  });
});
