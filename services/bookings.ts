/**
 * services/bookings.ts
 *
 * Stage 45 — Cancellation + refund logic.
 *
 * Rules:
 *   - Driver cancels: full refund regardless of timing
 *   - Passenger cancels > 24h before departure: full refund
 *   - Passenger cancels ≤ 24h before departure: no refund
 *   - Driver/vehicle did not match verified details (2A-e): full refund
 *     regardless of the 24h window + the driver's account is flagged for
 *     review (handled server-side by the create-refund Edge Function)
 *
 * Refunds run through the create-refund Edge Function (deployed): it locates
 * the booking's PaymentIntent (stored id or Stripe metadata search), refunds
 * in full with the transfer reversed and platform fee refunded, and treats an
 * already-refunded charge as success (idempotent retry). A booking that was
 * never paid (e.g. still pending) reports "no payment found" — that is not an
 * error for cancellation purposes.
 */

import { supabase } from '../lib/supabase';
import { sendPushToUser } from './notifications';
import type { SimpleResult } from './chat';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CancellationResult {
  success:   boolean;
  refunded:  boolean;
  message:   string;
}

export type RefundReason = 'driver_cancelled' | 'passenger_cancelled' | 'driver_mismatch';

type RefundOutcome = 'refunded' | 'no_payment' | 'failed';

/**
 * Execute a full refund for a booking via the create-refund Edge Function.
 * The cancellation that triggers this has ALWAYS already committed — so a
 * refund failure is reported distinctly (the caller tells the user to contact
 * support) rather than failing the whole cancellation.
 */
async function requestRefund(bookingId: string, reason: RefundReason): Promise<RefundOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('create-refund', {
      body: { bookingId, reason },
    });
    if (!error && (data as { refundId?: string } | null)?.refundId) return 'refunded';
    // supabase-js surfaces non-2xx as FunctionsHttpError; a 404 "no payment"
    // means the booking was never paid — nothing to refund.
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    if (status === 404) return 'no_payment';
    console.error('[Bookings] refund failed:', bookingId, reason, error?.message ?? data);
    return 'failed';
  } catch (e) {
    console.error('[Bookings] refund threw:', e instanceof Error ? e.message : e);
    return 'failed';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function isFullRefundEligible(
  departureDateTime: string,
  cancelledAt: Date = new Date(),
): boolean {
  const departure = new Date(departureDateTime);
  const msUntil   = departure.getTime() - cancelledAt.getTime();
  return msUntil > TWENTY_FOUR_HOURS_MS;
}

/**
 * Restore seats to a ride after a booking that held them is cancelled/declined
 * (book_ride decrements seats_available at REQUEST time, not at acceptance, so
 * every exit path — passenger cancels, driver declines — must give them back).
 * The booking's own status change has already committed by the time this
 * runs, so a failure here is logged, NOT thrown/returned as a failure — that
 * would tell the caller their cancellation/decline failed when it actually
 * succeeded, risking a confusing retry. Worst case is a temporarily
 * under-reported seat count, which never oversells a seat.
 *
 * Calls the restore_ride_seats RPC (migration 20260718000001) rather than a
 * client-side SELECT-then-UPDATE: two concurrent restores on the same ride
 * (e.g. two passengers on the same journey cancelling around the same time)
 * could otherwise both read the same starting seats_available and each write
 * back +1 instead of +2, silently losing a seat restoration. The RPC does the
 * whole read-modify-write as one UPDATE statement, which Postgres serialises.
 */
async function restoreRideSeats(rideId: string, seatsBooked: number): Promise<void> {
  const { error } = await supabase.rpc('restore_ride_seats', { p_ride_id: rideId, p_seats: seatsBooked });
  if (error) console.error('[Bookings] seat-restore RPC failed:', error.message);
}

// ─── Cancel as driver ─────────────────────────────────────────────────────────

/**
 * Driver cancels the ride.
 * All confirmed/pending bookings are cancelled and refunded.
 */
export async function cancelRideAsDriver(
  rideId: string,
  driverId: string,
): Promise<CancellationResult> {
  try {
    // Mark ride cancelled. .select('id') so a zero-row result (wrong id, or RLS
    // blocked because driverId doesn't own it) is distinguishable from success.
    const { data: rideRows, error: rideErr } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideId)
      .eq('driver_id', driverId)
      .select('id');

    if (rideErr) return { success: false, refunded: false, message: rideErr.message };
    if (!rideRows || rideRows.length === 0) {
      return { success: false, refunded: false, message: 'Ride not found or not permitted.' };
    }

    // Cancel all bookings on this ride. A query error here must not be reported
    // as a successful cancellation — passengers would be left thinking their
    // seat is still booked while the driver believes they were refunded.
    const { data: cancelledBookings, error: bookingsErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('ride_id', rideId)
      .in('status', ['pending', 'confirmed'])
      .select('id');

    if (bookingsErr) return { success: false, refunded: false, message: bookingsErr.message };

    // Full refund for every cancelled booking that was paid. The ride and
    // bookings are already cancelled — refund failures are collected, not
    // allowed to flip the cancellation into a phantom failure.
    let refundFailures = 0;
    for (const b of cancelledBookings ?? []) {
      if (await requestRefund(b.id, 'driver_cancelled') === 'failed') refundFailures += 1;
    }

    return {
      success:  true,
      refunded: refundFailures === 0,
      message:  refundFailures === 0
        ? 'Journey cancelled. All passengers will receive a full refund.'
        : 'Journey cancelled, but some refunds could not be processed automatically — htwa support will resolve them.',
    };
  } catch (e: unknown) {
    return {
      success:  false,
      refunded: false,
      message:  e instanceof Error ? e.message : 'Cancellation failed.',
    };
  }
}

// ─── Cancel as passenger ──────────────────────────────────────────────────────

/**
 * Passenger cancels their booking.
 * Refund eligibility depends on time until departure — unless the reason is
 * 'driver_mismatch' ("driver/vehicle did not match verified details", 2A-e),
 * which is ALWAYS a full refund and flags the driver's account for review
 * (the Edge Function records the account flag server-side).
 */
export async function cancelBookingAsPassenger(
  bookingId:         string,
  passengerId:       string,
  departureDateTime: string,
  reason:            'standard' | 'driver_mismatch' = 'standard',
): Promise<CancellationResult> {
  const refundEligible = reason === 'driver_mismatch' || isFullRefundEligible(departureDateTime);

  try {
    // .in('status', ...) guards against re-cancelling an already-cancelled or
    // already-declined booking — without it, a duplicate/replayed cancel call
    // (double-tap, retry after a UI glitch) would restore the seat a second
    // time, incorrectly inflating seats_available.
    const { data: bookingRows, error: bookErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('passenger_id', passengerId)
      .in('status', ['pending', 'confirmed'])
      .select('seats_booked, ride_id');

    if (bookErr) return { success: false, refunded: false, message: bookErr.message };
    const bookingData = bookingRows?.[0];
    if (!bookingData) {
      return { success: false, refunded: false, message: 'Booking not found, not permitted, or already cancelled.' };
    }

    await restoreRideSeats(bookingData.ride_id, bookingData.seats_booked);

    let refundOutcome: RefundOutcome | null = null;
    if (refundEligible) {
      refundOutcome = await requestRefund(
        bookingId,
        reason === 'driver_mismatch' ? 'driver_mismatch' : 'passenger_cancelled',
      );
    }

    if (reason === 'driver_mismatch') {
      return {
        success:  true,
        refunded: refundOutcome === 'refunded' || refundOutcome === 'no_payment',
        message:  refundOutcome === 'failed'
          ? 'Booking cancelled and the driver reported. Your refund could not be processed automatically — htwa support will resolve it.'
          : 'Booking cancelled and the driver reported. You will receive a full refund.',
      };
    }

    return {
      success:  true,
      refunded: refundEligible && refundOutcome !== 'failed',
      message:  !refundEligible
        ? 'Booking cancelled. No refund applies within 24h of departure.'
        : refundOutcome === 'failed'
          ? 'Booking cancelled, but your refund could not be processed automatically — htwa support will resolve it.'
          : 'Booking cancelled. Full refund issued within 3–5 business days.',
    };
  } catch (e: unknown) {
    return {
      success:  false,
      refunded: false,
      message:  e instanceof Error ? e.message : 'Cancellation failed.',
    };
  }
}

// ─── Driver accepts/declines a booking request ────────────────────────────────

/**
 * Driver declines a passenger's PENDING booking request. book_ride() decrements
 * seats_available at REQUEST time (not at acceptance), so declining must
 * restore the seat — otherwise seats_available stays permanently understated
 * and the ride could get stuck showing "full". `.eq('status', 'pending')`
 * guards against declining a request that's already been accepted/declined
 * (RLS also scopes this to the driver's own ride — see
 * "Driver can update bookings on own rides").
 */
export async function declineBooking(bookingId: string): Promise<SimpleResult> {
  try {
    const { data: bookingRows, error: bookErr } = await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select('seats_booked, ride_id, passenger_id');

    if (bookErr) return { ok: false, error: bookErr.message };
    const bookingData = bookingRows?.[0];
    if (!bookingData) {
      return { ok: false, error: 'Booking not found, not permitted, or already decided.' };
    }

    await restoreRideSeats(bookingData.ride_id, bookingData.seats_booked);

    // Push the passenger (secondary effect — the decline has already committed).
    void sendPushToUser(bookingData.passenger_id, 'booking_declined', { bookingId, rideId: bookingData.ride_id });

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not decline the booking.' };
  }
}
