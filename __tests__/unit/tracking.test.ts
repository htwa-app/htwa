/**
 * __tests__/unit/tracking.test.ts
 * Stage 49 — unit tests for utils/tracking.ts
 */
import { generateTrackingUrl } from '../../utils/tracking';

describe('generateTrackingUrl', () => {
  it('generates a URL with the correct base', () => {
    const url = generateTrackingUrl('trip-abc123');
    expect(url).toBe('https://htwa-app.com/track/trip-abc123');
  });

  it('includes the trip ID in the URL', () => {
    const tripId = 'test-trip-xyz';
    expect(generateTrackingUrl(tripId)).toContain(tripId);
  });

  it('throws for empty tripId', () => {
    expect(() => generateTrackingUrl('')).toThrow('tripId must not be empty');
  });

  it('throws for whitespace-only tripId', () => {
    expect(() => generateTrackingUrl('   ')).toThrow('tripId must not be empty');
  });

  it('produces different URLs for different trip IDs', () => {
    expect(generateTrackingUrl('trip-1')).not.toBe(generateTrackingUrl('trip-2'));
  });
});
