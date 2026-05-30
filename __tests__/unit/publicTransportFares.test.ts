/**
 * __tests__/unit/publicTransportFares.test.ts
 * Stage 60 — unit tests for utils/publicTransportFares.ts
 */
import { getPublicTransportFare, calculateSavings, normaliseLocationKey } from '../../utils/publicTransportFares';

describe('normaliseLocationKey', () => {
  it('lowercases and strips non-alpha', () => {
    expect(normaliseLocationKey('Dublin City')).toBe('dublincity');
  });
  it('truncates to 10 chars', () => {
    expect(normaliseLocationKey('Birmingham City Centre')).toHaveLength(10);
  });
});

describe('getPublicTransportFare', () => {
  it('returns fare for Dublin → Cork', () => {
    const fare = getPublicTransportFare('Dublin', 'Cork');
    expect(fare).not.toBeNull();
    expect(fare!.busFare).toBeGreaterThan(0);
    expect(fare!.trainFare).toBeGreaterThan(0);
  });

  it('returns same fare regardless of direction (Cork → Dublin)', () => {
    const fwd = getPublicTransportFare('Dublin', 'Cork');
    const rev = getPublicTransportFare('Cork', 'Dublin');
    expect(fwd).toEqual(rev);
  });

  it('returns null for unknown route', () => {
    expect(getPublicTransportFare('Mullingar', 'Athlone')).toBeNull();
  });

  it('returns fare for Dublin → Galway', () => {
    const fare = getPublicTransportFare('Dublin', 'Galway');
    expect(fare).not.toBeNull();
  });

  it('returns EUR currency for all routes', () => {
    const fare = getPublicTransportFare('Dublin', 'Belfast');
    expect(fare?.currency).toBe('EUR');
  });
});

describe('calculateSavings', () => {
  it('returns positive savings when amount paid is less than bus fare', () => {
    const savings = calculateSavings('Dublin', 'Cork', 5.00);
    expect(savings).not.toBeNull();
    expect(savings!.savedVsBus).toBeGreaterThan(0);
  });

  it('returns zero savings when amount paid exceeds bus fare', () => {
    const savings = calculateSavings('Dublin', 'Cork', 50.00);
    expect(savings!.savedVsBus).toBe(0);
  });

  it('returns null for unknown route', () => {
    expect(calculateSavings('Mullingar', 'Athlone', 5)).toBeNull();
  });

  it('train savings are positive for Dublin → Cork at low price', () => {
    const savings = calculateSavings('Dublin', 'Cork', 8);
    expect(savings!.savedVsTrain).toBeGreaterThan(0);
  });
});
