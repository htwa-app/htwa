/**
 * utils/journeyWindow.ts
 *
 * Change 2 — a driver cannot advertise two journeys whose time windows overlap
 * (they can't be in two places at once). Pure, unit-tested helpers.
 *
 * A journey's window is:
 *   windowStart = departureTime
 *   windowEnd   = departureTime + estimatedDuration + 30-minute buffer
 *
 * The 30-minute buffer is a mandatory gap before the next journey can start.
 * Two windows overlap iff  startA < endB AND startB < endA.
 */

/** Mandatory gap (seconds) after a journey's arrival before the next may start. */
export const OVERLAP_BUFFER_SECONDS = 30 * 60; // 30 minutes

/**
 * Conservative fallback duration (seconds) used when the Routes API can't
 * estimate travel time (e.g. the Maps key is missing/placeholder). Deliberately
 * generous (6 hours) so the window is LARGE and the check OVER-blocks rather
 * than letting genuine overlaps through.
 */
export const FALLBACK_DURATION_SECONDS = 6 * 60 * 60; // 6 hours

/**
 * Window end (ISO string) for a journey: departure + duration + buffer.
 * Falls back to FALLBACK_DURATION_SECONDS when duration is null/undefined.
 */
export function computeWindowEnd(
  departureISO: string,
  durationSeconds: number | null | undefined,
): string {
  const start = new Date(departureISO).getTime();
  const duration = durationSeconds != null && durationSeconds > 0
    ? durationSeconds
    : FALLBACK_DURATION_SECONDS;
  return new Date(start + (duration + OVERLAP_BUFFER_SECONDS) * 1000).toISOString();
}

/** True if [aStart,aEnd) and [bStart,bEnd) overlap. */
export function windowsOverlap(
  aStartISO: string,
  aEndISO: string,
  bStartISO: string,
  bEndISO: string,
): boolean {
  const aStart = new Date(aStartISO).getTime();
  const aEnd = new Date(aEndISO).getTime();
  const bStart = new Date(bStartISO).getTime();
  const bEnd = new Date(bEndISO).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export interface ExistingJourneyWindow {
  id: string;
  from_location: string;
  to_location: string;
  departure_datetime: string; // windowStart
  window_end: string;         // windowEnd
}

export interface JourneyConflict {
  journey: ExistingJourneyWindow;
  /** Earliest time the new journey could start without overlapping (= conflict's windowEnd). */
  nextAvailableFrom: string;
}

/**
 * Find the first existing journey whose window overlaps [newStart, newEnd).
 * Returns null if there is no conflict.
 */
export function findConflict(
  newStartISO: string,
  newEndISO: string,
  existing: ExistingJourneyWindow[],
): JourneyConflict | null {
  for (const j of existing) {
    if (windowsOverlap(newStartISO, newEndISO, j.departure_datetime, j.window_end)) {
      return { journey: j, nextAvailableFrom: j.window_end };
    }
  }
  return null;
}

/** Build the user-facing rejection message for a conflict. */
export function conflictMessage(conflict: JourneyConflict): string {
  const j = conflict.journey;
  const at = new Date(j.departure_datetime).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  const nextFrom = new Date(conflict.nextAvailableFrom).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  return `This overlaps your ${j.from_location} → ${j.to_location} journey at ${at}. Your next journey can start from ${nextFrom}.`;
}
