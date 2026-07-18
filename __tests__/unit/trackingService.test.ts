/**
 * __tests__/unit/trackingService.test.ts
 * Safety suite — unit tests for services/tracking.ts
 */

const mockRequestPermissions = jest.fn();
const mockWatchPosition = jest.fn();
const mockGetCurrentPosition = jest.fn();

jest.mock('expo-location', () => ({
  Accuracy: { High: 6 },
  requestForegroundPermissionsAsync: (...a: unknown[]) => mockRequestPermissions(...a),
  watchPositionAsync: (...a: unknown[]) => mockWatchPosition(...a),
  getCurrentPositionAsync: (...a: unknown[]) => mockGetCurrentPosition(...a),
}));

// ─── Supabase mock ────────────────────────────────────────────────────────────

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: { message: string } | null };
let mockHandler: (table: string, calls: Call[]) => Result;
const defaultHandler = (_t: string, calls: Call[]): Result => {
  const terminal = calls[calls.length - 1]?.method;
  return { data: terminal === 'maybeSingle' || terminal === 'single' ? null : [], error: null };
};

const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const calls: Call[] = [];
      const builder: Record<string, unknown> = {};
      ['select', 'eq', 'in', 'order', 'limit', 'update', 'insert', 'upsert'].forEach((m) => {
        builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder; };
      });
      builder.maybeSingle = () => { calls.push({ method: 'maybeSingle', args: [] }); return Promise.resolve(mockHandler(table, calls)); };
      builder.single = () => { calls.push({ method: 'single', args: [] }); return Promise.resolve(mockHandler(table, calls)); };
      builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(mockHandler(table, calls)).then(resolve);
      return builder;
    },
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    removeChannel: jest.fn(),
  },
}));

import {
  PUBLISH_INTERVAL_MS,
  SIGNAL_LOST_AFTER_MS,
  classifyFeed,
  getDefaultContact,
  getJourneyContact,
  getLatestLocation,
  raiseAlert,
  sendSOS,
  setJourneyContact,
  startPublishing,
  stopPublishing,
} from '../../services/tracking';
import type { TripLocationRow } from '../../types/database';

const CONTACT_ROW = {
  id: 'jc-1', ride_id: 'ride-1', user_id: 'u1',
  contact_name: 'Mam', contact_phone: '+353871234567',
  contact_user_id: null, tracking_token: 'tok-1',
  token_expires_at: null, created_at: '2026-07-18T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHandler = defaultHandler;
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockWatchPosition.mockResolvedValue({ remove: jest.fn() });
  mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 53.3, longitude: -6.3 } });
  mockInvoke.mockResolvedValue({ data: { ok: false, reason: 'unavailable' }, error: null });
  stopPublishing();
});

describe('getJourneyContact', () => {
  it('returns the contact when present', async () => {
    mockHandler = (table) => table === 'journey_contacts'
      ? { data: CONTACT_ROW, error: null } : defaultHandler(table, []);
    const res = await getJourneyContact('ride-1', 'u1');
    expect(res).toEqual({ ok: true, contact: CONTACT_ROW });
  });

  it('distinguishes "none" from a query error', async () => {
    const none = await getJourneyContact('ride-1', 'u1');
    expect(none).toEqual({ ok: false, reason: 'none' });

    mockHandler = () => ({ data: null, error: { message: 'boom' } });
    const err = await getJourneyContact('ride-1', 'u1');
    expect(err).toEqual({ ok: false, reason: 'error' });
  });
});

describe('getDefaultContact', () => {
  it('prefers the most recent journey contact', async () => {
    mockHandler = (table, calls) => {
      if (table === 'journey_contacts') return { data: { contact_name: 'Recent', contact_phone: '+353861', created_at: 'x' }, error: null };
      return defaultHandler(table, calls);
    };
    expect(await getDefaultContact('u1')).toEqual({ name: 'Recent', phone: '+353861' });
  });

  it('falls back to the profile nominated_contact', async () => {
    mockHandler = (table, calls) => {
      if (table === 'profiles') return { data: { nominated_contact: { name: 'Da', phone: '+353862' } }, error: null };
      return defaultHandler(table, calls);
    };
    expect(await getDefaultContact('u1')).toEqual({ name: 'Da', phone: '+353862' });
  });

  it('returns null (not a fake contact) on query error', async () => {
    mockHandler = () => ({ data: null, error: { message: 'down' } });
    expect(await getDefaultContact('u1')).toBeNull();
  });
});

describe('setJourneyContact', () => {
  it('rejects empty name/phone', async () => {
    const res = await setJourneyContact('ride-1', 'u1', { name: '  ', phone: '' });
    expect(res.ok).toBe(false);
  });

  it('links contact_user_id when the phone matches an htwa user', async () => {
    let upsertPayload: Record<string, unknown> | null = null;
    mockHandler = (table, calls) => {
      if (table === 'users') return { data: { id: 'contact-uid' }, error: null };
      if (table === 'journey_contacts') {
        const upsert = calls.find((c) => c.method === 'upsert');
        upsertPayload = upsert?.args[0] as Record<string, unknown>;
        return { data: { ...CONTACT_ROW, contact_user_id: 'contact-uid' }, error: null };
      }
      return defaultHandler(table, calls);
    };
    const res = await setJourneyContact('ride-1', 'u1', { name: 'Mam', phone: '+353871234567' });
    expect(res.ok).toBe(true);
    expect(upsertPayload).toMatchObject({ contact_user_id: 'contact-uid' });
  });

  it('a failed user-lookup still saves the contact (linking is best-effort)', async () => {
    mockHandler = (table, calls) => {
      if (table === 'users') return { data: null, error: { message: 'down' } };
      if (table === 'journey_contacts') return { data: CONTACT_ROW, error: null };
      return defaultHandler(table, calls);
    };
    const res = await setJourneyContact('ride-1', 'u1', { name: 'Mam', phone: '+353871234567' });
    expect(res.ok).toBe(true);
  });

  it('surfaces a save failure', async () => {
    mockHandler = (table, calls) => {
      if (table === 'journey_contacts') return { data: null, error: { message: 'rls' } };
      return defaultHandler(table, calls);
    };
    const res = await setJourneyContact('ride-1', 'u1', { name: 'Mam', phone: '+353871234567' });
    expect(res.ok).toBe(false);
  });
});

describe('startPublishing', () => {
  it('throws when permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    await expect(startPublishing('ride-1')).rejects.toThrow('Location permission denied');
  });

  it('inserts a trip_locations row for a fresh sample and throttles the next', async () => {
    const inserts: unknown[] = [];
    mockHandler = (table, calls) => {
      if (table === 'trip_locations' && calls.some((c) => c.method === 'insert')) {
        inserts.push(calls.find((c) => c.method === 'insert')?.args[0]);
        return { data: [], error: null };
      }
      return defaultHandler(table, calls);
    };
    await startPublishing('ride-1');
    const cb = mockWatchPosition.mock.calls[0][1] as (loc: unknown) => void;
    const sample = (lat: number) => cb({ coords: { latitude: lat, longitude: -6.3, heading: 90, speed: 20 }, timestamp: Date.now() });

    sample(53.30);
    sample(53.31); // within the throttle window — must NOT publish
    await new Promise((r) => setTimeout(r, 0));
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ ride_id: 'ride-1', lat: 53.30, lng: -6.3 });
  });

  it('hands every sample to onSample even when throttled', async () => {
    await stopPublishing();
    const samples: unknown[] = [];
    await startPublishing('ride-1', (p) => samples.push(p));
    const cb = mockWatchPosition.mock.calls[0][1] as (loc: unknown) => void;
    cb({ coords: { latitude: 53.3, longitude: -6.3, heading: null, speed: null }, timestamp: 1 });
    cb({ coords: { latitude: 53.4, longitude: -6.4, heading: null, speed: null }, timestamp: 2 });
    expect(samples).toHaveLength(2);
  });
});

describe('classifyFeed', () => {
  const row = (ageMs: number): TripLocationRow => ({
    id: 1, ride_id: 'r', lat: 1, lng: 2, heading: null, speed_mps: null,
    recorded_at: new Date(Date.now() - ageMs).toISOString(),
  });

  it('null feed is signal_lost', () => {
    expect(classifyFeed(null).state).toBe('signal_lost');
  });

  it('fresh sample is live; stale sample is signal_lost', () => {
    expect(classifyFeed(row(1000)).state).toBe('live');
    expect(classifyFeed(row(SIGNAL_LOST_AFTER_MS + 1000)).state).toBe('signal_lost');
  });
});

describe('getLatestLocation', () => {
  it('query error is ok:false, never an empty-feed lookalike', async () => {
    mockHandler = () => ({ data: null, error: { message: 'down' } });
    expect(await getLatestLocation('ride-1')).toEqual({ ok: false });
  });
});

describe('raiseAlert', () => {
  const contactHandler = (extra?: (table: string, calls: Call[]) => Result | null) =>
    (table: string, calls: Call[]): Result => {
      const custom = extra?.(table, calls);
      if (custom) return custom;
      if (table === 'journey_contacts') return { data: CONTACT_ROW, error: null };
      if (table === 'trip_alerts') {
        const terminal = calls[calls.length - 1]?.method;
        if (terminal === 'single') return { data: { id: 'alert-1' }, error: null };
        return { data: [], error: null };
      }
      return defaultHandler(table, calls);
    };

  it('records the alert and reports channels (SMS unavailable → realtime only)', async () => {
    mockHandler = contactHandler();
    const res = await raiseAlert({ rideId: 'ride-1', raisedBy: 'u1', alertType: 'off_course', location: { lat: 1, lng: 2 } });
    expect(res).toEqual({ ok: true, channels: ['realtime'] });
    expect(mockInvoke).toHaveBeenCalledWith('send-tracking-alert', expect.objectContaining({
      body: expect.objectContaining({ to: CONTACT_ROW.contact_phone }),
    }));
  });

  it('includes sms in channels when Twilio delivers', async () => {
    mockHandler = contactHandler();
    mockInvoke.mockResolvedValue({ data: { ok: true, sid: 'SM1' }, error: null });
    const res = await raiseAlert({ rideId: 'ride-1', raisedBy: 'u1', alertType: 'sos', location: null });
    expect(res).toEqual({ ok: true, channels: ['realtime', 'sms'] });
  });

  it('a failed audit insert fails the alert outright', async () => {
    mockHandler = contactHandler((table, calls) => {
      if (table === 'trip_alerts' && calls.some((c) => c.method === 'insert')) {
        return { data: null, error: { message: 'rls' } };
      }
      return null;
    });
    const res = await raiseAlert({ rideId: 'ride-1', raisedBy: 'u1', alertType: 'sos', location: null });
    expect(res.ok).toBe(false);
  });

  it('SMS failure after the audit insert does NOT fail the alert', async () => {
    mockHandler = contactHandler();
    mockInvoke.mockRejectedValue(new Error('edge down'));
    const res = await raiseAlert({ rideId: 'ride-1', raisedBy: 'u1', alertType: 'sos', location: { lat: 1, lng: 2 } });
    expect(res).toEqual({ ok: true, channels: ['realtime'] });
  });
});

describe('sendSOS', () => {
  it('uses live GPS when available', async () => {
    let insertedAlert: Record<string, unknown> | null = null;
    mockHandler = (table, calls) => {
      if (table === 'journey_contacts') return { data: CONTACT_ROW, error: null };
      if (table === 'trip_alerts') {
        const ins = calls.find((c) => c.method === 'insert');
        if (ins) insertedAlert = ins.args[0] as Record<string, unknown>;
        const terminal = calls[calls.length - 1]?.method;
        return terminal === 'single' ? { data: { id: 'a1' }, error: null } : { data: [], error: null };
      }
      return defaultHandler(table, calls);
    };
    const res = await sendSOS('ride-1', 'u1');
    expect(res.ok).toBe(true);
    expect(insertedAlert).toMatchObject({ alert_type: 'sos', lat: 53.3, lng: -6.3 });
  });

  it('falls back to the last persisted point when GPS fails', async () => {
    mockGetCurrentPosition.mockRejectedValue(new Error('gps off'));
    let insertedAlert: Record<string, unknown> | null = null;
    mockHandler = (table, calls) => {
      if (table === 'journey_contacts') return { data: CONTACT_ROW, error: null };
      if (table === 'trip_locations') {
        return { data: { id: 9, ride_id: 'ride-1', lat: 52.9, lng: -7.1, heading: null, speed_mps: null, recorded_at: new Date().toISOString() }, error: null };
      }
      if (table === 'trip_alerts') {
        const ins = calls.find((c) => c.method === 'insert');
        if (ins) insertedAlert = ins.args[0] as Record<string, unknown>;
        const terminal = calls[calls.length - 1]?.method;
        return terminal === 'single' ? { data: { id: 'a1' }, error: null } : { data: [], error: null };
      }
      return defaultHandler(table, calls);
    };
    const res = await sendSOS('ride-1', 'u1');
    expect(res.ok).toBe(true);
    expect(insertedAlert).toMatchObject({ alert_type: 'sos', lat: 52.9, lng: -7.1 });
  });
});
