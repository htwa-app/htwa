/**
 * __tests__/unit/journeyConflicts.test.ts
 * Change 2 — client-side driver overlap check (fetches own active journeys).
 */
const mockRows = jest.fn();
const mockEq2 = jest.fn(() => mockRows());
const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
jest.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: mockEq1 }) }) },
}));

import { checkDriverOverlap } from '../../services/journeyConflicts';
import { computeWindowEnd } from '../../utils/journeyWindow';

beforeEach(() => jest.clearAllMocks());

const existingJourney = {
  id: 'j1', from_location: 'Derry', to_location: 'Dublin',
  departure_datetime: '2026-06-10T10:00:00.000Z',
  window_end: computeWindowEnd('2026-06-10T10:00:00.000Z', 3600), // 11:30
};

describe('checkDriverOverlap', () => {
  it('passes when there are no existing journeys', async () => {
    mockRows.mockResolvedValue({ data: [], error: null });
    const res = await checkDriverOverlap('u1', '2026-06-10T12:00:00.000Z', 3600);
    expect(res.ok).toBe(true);
  });

  it('rejects an overlapping journey with a clear message', async () => {
    mockRows.mockResolvedValue({ data: [existingJourney], error: null });
    const res = await checkDriverOverlap('u1', '2026-06-10T11:20:00.000Z', 3600); // inside buffer
    expect(res.ok).toBe(false);
    expect(res.message).toContain('Derry → Dublin');
  });

  it('allows a journey starting after the buffer window', async () => {
    mockRows.mockResolvedValue({ data: [existingJourney], error: null });
    const res = await checkDriverOverlap('u1', '2026-06-10T11:40:00.000Z', 3600); // 40m later
    expect(res.ok).toBe(true);
  });

  it('only queries journeys where the user is the driver, active', async () => {
    mockRows.mockResolvedValue({ data: [], error: null });
    await checkDriverOverlap('u1', '2026-06-10T12:00:00.000Z', 3600);
    expect(mockEq1).toHaveBeenCalledWith('driver_id', 'u1');
    expect(mockEq2).toHaveBeenCalledWith('status', 'active');
  });

  it('uses the conservative fallback window for legacy rows missing window_end', async () => {
    mockRows.mockResolvedValue({ data: [{ ...existingJourney, window_end: null }], error: null });
    // new journey at 13:00 — within the 6h30m fallback window (10:00 → 16:30) → rejected
    const res = await checkDriverOverlap('u1', '2026-06-10T13:00:00.000Z', 3600);
    expect(res.ok).toBe(false);
  });
});
