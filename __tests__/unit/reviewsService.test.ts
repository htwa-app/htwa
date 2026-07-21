/**
 * __tests__/unit/reviewsService.test.ts
 * Stages 56–57 — unit tests for services/reviews.ts (rollup).
 */

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: { message: string } | null; count?: number | null };
let mockHandler: (table: string, calls: Call[]) => Result;
const defaultHandler = (): Result => ({ data: [], error: null, count: 0 });

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const calls: Call[] = [];
      const builder: Record<string, unknown> = {};
      ['select', 'eq', 'in', 'order', 'limit'].forEach((m) => {
        builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder; };
      });
      builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(mockHandler(table, calls)).then(resolve);
      return builder;
    },
  },
}));

import { getCompletedTripsCount, getReviewSummary } from '../../services/reviews';

const REVIEWS = [
  { id: 'rv1', rating: 5, comment: 'Sound driver', reviewer_id: 'a', created_at: '2026-07-01T00:00:00Z' },
  { id: 'rv2', rating: 4, comment: null, reviewer_id: 'b', created_at: '2026-06-01T00:00:00Z' },
];

beforeEach(() => { mockHandler = defaultHandler; });

describe('getReviewSummary', () => {
  it('computes average, count and names', async () => {
    mockHandler = (table) => {
      // count: 'exact' is now requested on the same query as the row data
      // (merged into one round trip), so a single reviews response carries both.
      if (table === 'reviews') return { data: REVIEWS, error: null, count: 2 };
      if (table === 'users') return { data: [{ id: 'a', full_name: 'Aoife' }, { id: 'b', full_name: 'Brid' }], error: null };
      return defaultHandler();
    };
    const res = await getReviewSummary('u1');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.summary.average).toBe(4.5);
      expect(res.summary.count).toBe(2);
      expect(res.summary.reviews[0]).toMatchObject({ reviewerName: 'Aoife', rating: 5 });
    }
  });

  it('no reviews → average null, count 0 (a real state, not an error)', async () => {
    const res = await getReviewSummary('u1');
    expect(res).toEqual({ ok: true, summary: { average: null, count: 0, reviews: [] } });
  });

  it('a query error is ok:false — never a fake empty summary', async () => {
    mockHandler = () => ({ data: null, error: { message: 'down' } });
    expect(await getReviewSummary('u1')).toEqual({ ok: false });
  });

  it('a failed reviewer-name lookup fails loud rather than mislabelling reviews', async () => {
    mockHandler = (table) => {
      if (table === 'reviews') return { data: REVIEWS, error: null, count: 2 };
      return { data: null, error: { message: 'down' } };
    };
    expect(await getReviewSummary('u1')).toEqual({ ok: false });
  });
});

describe('getCompletedTripsCount', () => {
  it('sums completed driver rides and completed passenger journeys', async () => {
    mockHandler = (table, calls) => {
      if (table === 'rides' && calls.some((c) => c.method === 'eq' && c.args[0] === 'driver_id')) {
        return { data: null, error: null, count: 3 };
      }
      if (table === 'bookings') return { data: [{ ride_id: 'r1' }, { ride_id: 'r2' }], error: null };
      if (table === 'rides' && calls.some((c) => c.method === 'in')) {
        return { data: null, error: null, count: 1 };
      }
      return defaultHandler();
    };
    expect(await getCompletedTripsCount('u1')).toEqual({ ok: true, count: 4 });
  });

  it('a query error is ok:false, never a fake 0', async () => {
    mockHandler = () => ({ data: null, error: { message: 'down' } });
    expect(await getCompletedTripsCount('u1')).toEqual({ ok: false });
  });
});
