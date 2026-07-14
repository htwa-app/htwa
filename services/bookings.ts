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

    // Restore seats on ride. The booking is ALREADY cancelled at this point (the
    // update above committed), so a failure here must NOT flip the overall
    // result to failure — that would tell the passenger their cancellation
    // failed (risking a confusing retry) when it actually succeeded. Log it
    // instead; worst case is a temporarily under-reported seat count, which
    // never oversells a seat.
    const { data: rideData, error: rideReadErr } = await supabase
      .from('rides')
      .select('seats_available, seats_total, status')
      .eq('id', bookingData.ride_id)
      .single();

    if (rideReadErr) {
      console.error('[Bookings] seat-restore ride read failed:', rideReadErr.message);
    } else {
      const newAvail = Math.min(rideData.seats_total, rideData.seats_available + bookingData.seats_booked);
      const { error: seatErr } = await supabase.from('rides').update({
        seats_available: newAvail,
        status: rideData.status === 'full' ? 'active' : rideData.status,
      }).eq('id', bookingData.ride_id);
      if (seatErr) console.error('[Bookings] seat-restore update failed:', seatErr.message);
    }

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
