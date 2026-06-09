/**
 * services/journeyConflicts.ts
 *
 * Change 2 — client-side overlap check for immediate UX feedback before posting.
 * The DB trigger (migration 20260601000005) is the authoritative guard; this
 * gives the driver a clear message without a round-trip rejection.
 */

import { supabase } from '../lib/supabase';
import {
  computeWindowEnd,
  findConflict,
  conflictMessage,
  type ExistingJourneyWindow,
  type JourneyConflict,
} from '../utils/journeyWindow';

export interface OverlapCheckResult {
  ok: boolean;              // true = no conflict
  message?: string;         // user-facing, present when ok=false
  conflict?: JourneyConflict;
}

/**
 * Check whether a proposed journey overlaps any ACTIVE journey the user is
 * already DRIVING (passenger bookings live in a separate table and don't count).
 */
export async function checkDriverOverlap(
  driverId: string,
  newDepartureISO: string,
  newDurationSeconds: number | null,
): Promise<OverlapCheckResult> {
  const newEnd = computeWindowEnd(newDepartureISO, newDurationSeconds);

  const { data } = await supabase
    .from('rides')
    .select('id, from_location, to_location, departure_datetime, window_end')
    .eq('driver_id', driverId)
    .eq('status', 'active');

  const existing: ExistingJourneyWindow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    from_location: r.from_location as string,
    to_location: r.to_location as string,
    departure_datetime: r.departure_datetime as string,
    // Legacy rows without window_end → conservative fallback window.
    window_end: (r.window_end as string | null) ?? computeWindowEnd(r.departure_datetime as string, null),
  }));

  const conflict = findConflict(newDepartureISO, newEnd, existing);
  if (conflict) return { ok: false, conflict, message: conflictMessage(conflict) };
  return { ok: true };
}
