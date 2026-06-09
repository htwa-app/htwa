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
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);
  return error ? { ok: false, error: error.message } : { ok: true };
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
  const { data } = await supabase
    .from('bookings')
    .select('chat_status, ride:rides(status)')
    .eq('id', bookingId)
    .maybeSingle();
  if (!data) return null;
  const ride = (data as { ride?: { status?: string } | null }).ride;
  return {
    chatStatus: ((data as { chat_status?: string }).chat_status ?? 'open') as ChatStatus,
    rideStatus: (ride?.status ?? null) as RideStatus | null,
  };
}
