/**
 * services/bookings.ts
 *
 * Stage 45 — Cancellation + refund logic.
 *
 * Rules:
 *   - Driver cancels: full refund regardless of timing
 *   - Passenger cancels > 24h before departure: full refund
 *   - Passenger cancels ≤ 24h before departure: no refund
 *
 * Refund is issued via a Supabase Edge Function that calls the Stripe Refund API.
 * The Edge Function is stubbed — actual implementation requires the webhook
 * and PaymentIntent ID to be stored on the booking row (Phase 15).
 */

import { supabase } from '../lib/supabase';
import type { SimpleResult } from './chat';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CancellationResult {
  success:   boolean;
  refunded:  boolean;
  message:   string;
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
 */
async function restoreRideSeats(rideId: string, seatsBooked: number): Promise<void> {
  const { data: rideData, error: rideReadErr } = await supabase
    .from('rides')
    .select('seats_available, seats_total, status')
    .eq('id', rideId)
    .single();

  if (rideReadErr) {
    console.error('[Bookings] seat-restore ride read failed:', rideReadErr.message);
    return;
  }

  const newAvail = Math.min(rideData.seats_total, rideData.seats_available + seatsBooked);
  const { error: seatErr } = await supabase.from('rides').update({
    seats_available: newAvail,
    status: rideData.status === 'full' ? 'active' : rideData.status,
  }).eq('id', rideId);
  if (seatErr) console.error('[Bookings] seat-restore update failed:', seatErr.message);
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
    const { error: bookingsErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('ride_id', rideId)
      .in('status', ['pending', 'confirmed']);

    if (bookingsErr) return { success: false, refunded: false, message: bookingsErr.message };

    // TODO (Phase 15): iterate bookings, call create-refund edge function for each confirmed booking

    return {
      success:  true,
      refunded: true,
      message:  'Ride cancelled. All passengers will receive a full refund.',
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
 * Refund eligibility depends on time until departure.
 */
export async function cancelBookingAsPassenger(
  bookingId:         string,
  passengerId:       string,
  departureDateTime: string,
): Promise<CancellationResult> {
  const refundEligible = isFullRefundEligible(departureDateTime);

  try {
    const { data: bookingRows, error: bookErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('passenger_id', passengerId)
      .select('seats_booked, ride_id');

    if (bookErr) return { success: false, refunded: false, message: bookErr.message };
    const bookingData = bookingRows?.[0];
    if (!bookingData) {
      return { success: false, refunded: false, message: 'Booking not found or not permitted.' };
    }

    await restoreRideSeats(bookingData.ride_id, bookingData.seats_booked);

    // TODO (Phase 15): if refundEligible, call create-refund edge function

    return {
      success:  true,
      refunded: refundEligible,
      message:  refundEligible
        ? 'Booking cancelled. Full refund issued within 3–5 business days.'
        : 'Booking cancelled. No refund applies within 24h of departure.',
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
      .select('seats_booked, ride_id');

    if (bookErr) return { ok: false, error: bookErr.message };
    const bookingData = bookingRows?.[0];
    if (!bookingData) {
      return { ok: false, error: 'Booking not found, not permitted, or already decided.' };
    }

    await restoreRideSeats(bookingData.ride_id, bookingData.seats_booked);

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not decline the booking.' };
  }
}
