/**
 * __tests__/unit/journeyWindow.test.ts
 * Change 2 — no-overlapping-journeys window helpers.
 */
import {
  OVERLAP_BUFFER_SECONDS,
  FALLBACK_DURATION_SECONDS,
  computeWindowEnd,
  windowsOverlap,
  findConflict,
  conflictMessage,
  type ExistingJourneyWindow,
} from '../../utils/journeyWindow';

describe('computeWindowEnd', () => {
  it('adds duration + 30-minute buffer to the departure', () => {
    // 10:00 + 1h drive + 30m buffer = 11:30
    expect(computeWindowEnd('2026-06-10T10:00:00.000Z', 3600)).toBe('2026-06-10T11:30:00.000Z');
  });
  it('uses the conservative fallback duration when none is given', () => {
    // 10:00 + 6h fallback + 30m buffer = 16:30
    const end = computeWindowEnd('2026-06-10T10:00:00.000Z', null);
    expect(end).toBe('2026-06-10T16:30:00.000Z');
    expect(FALLBACK_DURATION_SECONDS + OVERLAP_BUFFER_SECONDS).toBe(6.5 * 3600);
  });
});

describe('windowsOverlap', () => {
  it('true when windows intersect', () => {
    expect(windowsOverlap('2026-06-10T10:00:00Z', '2026-06-10T12:00:00Z', '2026-06-10T11:00:00Z', '2026-06-10T13:00:00Z')).toBe(true);
  });
  it('false when windows are disjoint (touching edges do not overlap)', () => {
    expect(windowsOverlap('2026-06-10T10:00:00Z', '2026-06-10T12:00:00Z', '2026-06-10T12:00:00Z', '2026-06-10T13:00:00Z')).toBe(false);
  });
});

describe('findConflict — 30-minute buffer behaviour', () => {
  // Existing journey: departs 10:00, 1h drive → arrives 11:00, window end (incl. 30m buffer) = 11:30.
  const existing: ExistingJourneyWindow[] = [{
    id: 'j1', from_location: 'Derry', to_location: 'Dublin',
    departure_datetime: '2026-06-10T10:00:00.000Z',
    window_end: computeWindowEnd('2026-06-10T10:00:00.000Z', 3600), // 11:30
  }];

  it('rejects a new journey starting 20 minutes after arrival (inside the buffer)', () => {
    // New departs 11:20 (< 11:30 buffer end) → overlaps
    const newStart = '2026-06-10T11:20:00.000Z';
    const newEnd = computeWindowEnd(newStart, 3600);
    expect(findConflict(newStart, newEnd, existing)).not.toBeNull();
  });

  it('allows a new journey starting 40 minutes after arrival (past the buffer)', () => {
    // New departs 11:40 (> 11:30) → no overlap
    const newStart = '2026-06-10T11:40:00.000Z';
    const newEnd = computeWindowEnd(newStart, 3600);
    expect(findConflict(newStart, newEnd, existing)).toBeNull();
  });

  it('rejects a directly overlapping journey and reports next-available time', () => {
    const newStart = '2026-06-10T10:30:00.000Z';
    const newEnd = computeWindowEnd(newStart, 3600);
    const conflict = findConflict(newStart, newEnd, existing);
    expect(conflict).not.toBeNull();
    expect(conflict!.nextAvailableFrom).toBe(existing[0].window_end);
  });

  it('allows a fully sequential journey (next day)', () => {
    const newStart = '2026-06-11T10:00:00.000Z';
    const newEnd = computeWindowEnd(newStart, 3600);
    expect(findConflict(newStart, newEnd, existing)).toBeNull();
  });
});

describe('conflictMessage', () => {
  it('names the conflicting journey', () => {
    const existing: ExistingJourneyWindow = {
      id: 'j1', from_location: 'Derry', to_location: 'Dublin',
      departure_datetime: '2026-06-10T10:00:00.000Z',
      window_end: '2026-06-10T11:30:00.000Z',
    };
    const msg = conflictMessage({ journey: existing, nextAvailableFrom: existing.window_end });
    expect(msg).toContain('Derry → Dublin');
    expect(msg).toMatch(/Your next journey can start from/);
  });
});
