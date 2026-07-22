/**
 * services/waivers.ts
 *
 * Records acceptances of the Journey Verification & Safety Responsibility
 * Acknowledgment (2A-d) in waiver_acceptances. For passengers this MUST
 * succeed before book_ride is called — the RPC enforces the acceptance exists
 * (raises 'waiver_required'), so a silently-failed insert here would surface
 * as a booking failure rather than a phantom booking.
 */

import { supabase } from '../lib/supabase';
import { WAIVER_VERSION } from '../constants/legalWaiver';
import type { WaiverRole } from '../types/database';

export type WaiverResult = { ok: true } | { ok: false; message: string };

export async function recordWaiverAcceptance(params: {
  userId: string;
  role: WaiverRole;
  rideId: string;
  bookingId?: string;
}): Promise<WaiverResult> {
  try {
    const { data, error } = await supabase
      .from('waiver_acceptances')
      .insert({
        user_id: params.userId,
        ride_id: params.rideId,
        booking_id: params.bookingId ?? null,
        role: params.role,
        document_version: WAIVER_VERSION,
      })
      .select('id');
    if (error || !data || data.length === 0) {
      return { ok: false, message: 'Could not record your acceptance. Please try again.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not record your acceptance. Please try again.' };
  }
}

/** Whether the user already accepted the waiver for this journey+role (idempotent re-entry). */
export async function hasAcceptedWaiver(userId: string, rideId: string, role: WaiverRole): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('waiver_acceptances')
      .select('id')
      .eq('user_id', userId)
      .eq('ride_id', rideId)
      .eq('role', role)
      .limit(1);
    if (error) return false;
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}
