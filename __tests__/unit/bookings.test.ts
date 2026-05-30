/**
 * __tests__/unit/bookings.test.ts
 * Stage 45 — unit tests for services/bookings.ts
 */

// Mock supabase so the env var check doesn't throw
jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));

import { isFullRefundEligible } from '../../services/bookings';

describe('isFullRefundEligible', () => {
  it('returns true when > 24h before departure', () => {
    const dep = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(true);
  });

  it('returns false when < 24h before departure', () => {
    const dep = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns false when exactly 24h (boundary — not strictly greater)', () => {
    const dep = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns false when departure is in the past', () => {
    const dep = new Date(Date.now() - 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns true when 48h before departure', () => {
    const dep = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(true);
  });

  it('uses a custom cancelledAt reference date', () => {
    const dep        = new Date('2026-07-01T12:00:00Z').toISOString();
    const earlyCancel = new Date('2026-06-29T10:00:00Z'); // > 24h before
    const lateCancel  = new Date('2026-07-01T00:00:00Z'); // < 24h before
    expect(isFullRefundEligible(dep, earlyCancel)).toBe(true);
    expect(isFullRefundEligible(dep, lateCancel)).toBe(false);
  });

  it('returns false 30 minutes before departure', () => {
    const dep = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(false);
  });

  it('returns true 3 days before departure', () => {
    const dep = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    expect(isFullRefundEligible(dep)).toBe(true);
  });
});
