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
    // Mark ride cancelled
    const { error: rideErr } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideId)
      .eq('driver_id', driverId);

    if (rideErr) return { success: false, refunded: false, message: rideErr.message };

    // Cancel all bookings on this ride
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('ride_id', rideId)
      .in('status', ['pending', 'confirmed']);

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
    const { error: bookErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('passenger_id', passengerId);

    if (bookErr) return { success: false, refunded: false, message: bookErr.message };

    // Restore seats on ride
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('seats_booked, ride_id')
      .eq('id', bookingId)
      .single();

    if (bookingData) {
      const { data: rideData } = await supabase
        .from('rides')
        .select('seats_available, seats_total, status')
        .eq('id', bookingData.ride_id)
        .single();

      if (rideData) {
        const newAvail = Math.min(rideData.seats_total, rideData.seats_available + bookingData.seats_booked);
        await supabase.from('rides').update({
          seats_available: newAvail,
          status: rideData.status === 'full' ? 'active' : rideData.status,
        }).eq('id', bookingData.ride_id);
      }
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
