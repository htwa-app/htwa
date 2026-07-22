/**
 * services/chat.ts
 *
 * Change 3 — chat lifecycle helpers.
 *
 * A chat is OPEN once the driver ACCEPTS the booking (status -> 'confirmed').
 * It can be CLOSED only after the journey is complete; closing is one-way and
 * makes the chat a read-only archive. Messages are NEVER deletable (retained
 * server-side forever for safeguarding — see migration 20260601000006).
 */

import { supabase } from '../lib/supabase';
import { sendPushToUser } from './notifications';
import type { RideStatus, ChatStatus } from '../types/database';

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

/**
 * Driver accepts a passenger's booking request → booking becomes 'confirmed',
 * which makes the (already 'open') chat available to both parties.
 */
export async function acceptBooking(bookingId: string): Promise<SimpleResult> {
  // .eq('status', 'pending') guards against accepting a booking that's already
  // been declined/cancelled — without it, a stale retry could flip a declined
  // booking's status back to 'confirmed' (and reopen its chat) after the
  // passenger has already been told it was declined.
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .select('id, passenger_id, ride_id');
  if (error) return { ok: false, error: error.message };
  // A non-error response with zero rows updated (e.g. blocked by RLS, the
  // booking no longer exists, or it's no longer pending) must NOT read as success.
  if (!data || data.length === 0) {
    return { ok: false, error: 'Booking could not be accepted (not found, not permitted, or already decided).' };
  }
  // Push the passenger (secondary effect — the confirm has already committed;
  // sendPushToUser logs its own failures, never surfaces them here).
  const booking = data[0];
  void sendPushToUser(booking.passenger_id, 'booking_accepted', { bookingId, rideId: booking.ride_id });
  return { ok: true };
}

/**
 * Pure gate: a chat may only be closed once the journey (ride) is completed.
 * Mirrors the server-side rule enforced by the close_chat() RPC.
 */
export function canCloseChat(rideStatus: RideStatus | null | undefined): boolean {
  return rideStatus === 'completed';
}

/**
 * Close a chat (one-way). The server RPC re-checks participant + completion, so
 * a tampered client cannot close early.
 */
export async function closeChat(bookingId: string): Promise<SimpleResult> {
  const { error } = await supabase.rpc('close_chat', { p_booking_id: bookingId });
  if (!error) return { ok: true };
  // The RPC raises 'journey_not_complete' / 'not_a_participant' / 'booking_not_found'.
  return { ok: false, error: error.message };
}

export interface ChatMeta {
  chatStatus: ChatStatus;
  rideStatus: RideStatus | null;
}

/** Load the chat lifecycle state for a booking (chat_status + the ride's status). */
export async function getChatMeta(bookingId: string): Promise<ChatMeta | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('chat_status, ride:rides(status)')
    .eq('id', bookingId)
    .maybeSingle();
  // Distinguish a query failure from a genuine "not found": throw on error so
  // callers don't silently treat a failed read as an absent booking.
  if (error) throw new Error(error.message);
  if (!data) return null;
  const ride = (data as { ride?: { status?: string } | null }).ride;
  return {
    chatStatus: ((data as { chat_status?: string }).chat_status ?? 'open') as ChatStatus,
    rideStatus: (ride?.status ?? null) as RideStatus | null,
  };
}
