/**
 * __tests__/unit/publicTransportFares.test.ts
 * Stage 60 — unit tests for utils/publicTransportFares.ts
 */
import {
  getFareEstimate,
  getSavingVsPublicTransport,
  normaliseLocationKey,
} from '../../utils/publicTransportFares';

describe('getFareEstimate', () => {
  it('returns the fare for each known route', () => {
    expect(getFareEstimate('Dublin', 'Galway')).toBe(13);
    expect(getFareEstimate('Dublin', 'Cork')).toBe(20);
    expect(getFareEstimate('Dublin', 'Limerick')).toBe(16);
    expect(getFareEstimate('Dublin', 'Belfast')).toBe(18);
    expect(getFareEstimate('Cork', 'Limerick')).toBe(10);
    expect(getFareEstimate('Galway', 'Limerick')).toBe(12);
  });

  it('is direction-agnostic', () => {
    expect(getFareEstimate('Galway', 'Dublin')).toBe(getFareEstimate('Dublin', 'Galway'));
    expect(getFareEstimate('Limerick', 'Cork')).toBe(10);
  });

  it('ignores case, spaces and punctuation', () => {
    expect(getFareEstimate('  dublin ', 'GALWAY')).toBe(13);
    expect(getFareEstimate('Dublin, Ireland', 'Cork City')).toBe(20);
  });

  it('returns null for an unknown route', () => {
    expect(getFareEstimate('Sligo', 'Wexford')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(getFareEstimate('', 'Cork')).toBeNull();
  });
});

describe('getSavingVsPublicTransport', () => {
  it('returns the positive saving vs the fare', () => {
    expect(getSavingVsPublicTransport('Dublin', 'Galway', 5)).toBe(8); // 13 - 5
  });

  it('never returns a negative saving', () => {
    expect(getSavingVsPublicTransport('Cork', 'Limerick', 15)).toBe(0); // fare 10
  });

  it('returns null for an unknown route', () => {
    expect(getSavingVsPublicTransport('Sligo', 'Wexford', 5)).toBeNull();
  });
});

describe('normaliseLocationKey', () => {
  it('strips non-letters and lowercases', () => {
    expect(normaliseLocationKey('Dublin 2, IE')).toBe('dublinie');
  });
});
