/**
 * __tests__/unit/driverVerificationService.test.ts
 * Round-2 fix #2 — unit tests for services/driverVerification.ts
 */

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: { message: string } | null };
let mockDbHandler: (table: string, calls: Call[]) => Result;
const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const calls: Call[] = [];
      const builder: Record<string, unknown> = {};
      ['select', 'eq', 'upsert'].forEach((m) => {
        builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder; };
      });
      builder.maybeSingle = () => { calls.push({ method: 'maybeSingle', args: [] }); return Promise.resolve(mockDbHandler(table, calls)); };
      builder.single = () => { calls.push({ method: 'single', args: [] }); return Promise.resolve(mockDbHandler(table, calls)); };
      return builder;
    },
    storage: {
      from: (bucket: string) => ({
        upload: (...a: unknown[]) => mockUpload(bucket, ...a),
        remove: (...a: unknown[]) => mockRemove(bucket, ...a),
      }),
    },
  },
}));

import {
  getDriverVerification,
  submitDriverVerification,
} from '../../services/driverVerification';
import type { DriverVerificationRow } from '../../types/database';

const FIELDS = { make: 'Toyota', model: 'Corolla', registration: '191-d-12345', colour: 'Red' };
const BYTES = new Uint8Array([1]);
const ROW: DriverVerificationRow = {
  user_id: 'u1', licence_photo_path: 'u1/licence-1.jpg', selfie_photo_path: 'u1/selfie-1.jpg',
  car_photo_path: 'u1/car-1.jpg', car_make: 'Toyota', car_model: 'Corolla',
  car_registration: '191-D-12345', car_colour: 'Red', status: 'pending',
  review_note: null, submitted_at: 'x', reviewed_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDbHandler = () => ({ data: ROW, error: null });
  mockUpload.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
});

describe('getDriverVerification', () => {
  it('distinguishes "no submission yet" from a query error', async () => {
    mockDbHandler = () => ({ data: null, error: null });
    expect(await getDriverVerification('u1')).toEqual({ ok: true, verification: null });

    mockDbHandler = () => ({ data: null, error: { message: 'down' } });
    expect(await getDriverVerification('u1')).toEqual({ ok: false });
  });
});

describe('submitDriverVerification', () => {
  it('rejects incomplete fields without touching storage', async () => {
    const res = await submitDriverVerification('u1', { ...FIELDS, registration: '  ' },
      { licenceBytes: BYTES, selfieBytes: BYTES, carBytes: BYTES }, null);
    expect(res.ok).toBe(false);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('requires all three photos on first submission', async () => {
    const res = await submitDriverVerification('u1', FIELDS,
      { licenceBytes: BYTES, selfieBytes: null, carBytes: BYTES }, null);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/three photos/i);
  });

  it('routes photos to the right buckets: licence+car locked down, selfie to the disclosure bucket', async () => {
    const res = await submitDriverVerification('u1', FIELDS,
      { licenceBytes: BYTES, selfieBytes: BYTES, carBytes: BYTES }, null);
    expect(res.ok).toBe(true);
    const buckets = mockUpload.mock.calls.map((c) => [c[0], c[1]]);
    expect(buckets).toEqual(expect.arrayContaining([
      ['driver-verifications', expect.stringMatching(/^u1\/licence-/)],
      ['verification-selfies', expect.stringMatching(/^u1\/selfie-/)],
      ['driver-verifications', expect.stringMatching(/^u1\/car-/)],
    ]));
  });

  it('normalises the registration to uppercase in the record', async () => {
    let upserted: Record<string, unknown> | null = null;
    mockDbHandler = (table, calls) => {
      const up = calls.find((c) => c.method === 'upsert');
      if (up) upserted = up.args[0] as Record<string, unknown>;
      return { data: ROW, error: null };
    };
    await submitDriverVerification('u1', FIELDS, { licenceBytes: BYTES, selfieBytes: BYTES, carBytes: BYTES }, null);
    expect(upserted).toMatchObject({ car_registration: '191-D-12345' });
  });

  it('resubmission without new photos keeps the stored paths', async () => {
    let upserted: Record<string, unknown> | null = null;
    mockDbHandler = (table, calls) => {
      const up = calls.find((c) => c.method === 'upsert');
      if (up) upserted = up.args[0] as Record<string, unknown>;
      return { data: ROW, error: null };
    };
    const res = await submitDriverVerification('u1', FIELDS, {}, ROW);
    expect(res.ok).toBe(true);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(upserted).toMatchObject({
      licence_photo_path: 'u1/licence-1.jpg',
      selfie_photo_path: 'u1/selfie-1.jpg',
      car_photo_path: 'u1/car-1.jpg',
    });
  });

  it('a failed DB write removes only the newly uploaded files', async () => {
    mockDbHandler = (table, calls) => {
      if (calls.some((c) => c.method === 'upsert')) return { data: null, error: { message: 'rls' } };
      return { data: null, error: null };
    };
    const res = await submitDriverVerification('u1', FIELDS,
      { licenceBytes: BYTES, selfieBytes: BYTES, carBytes: BYTES }, null);
    expect(res.ok).toBe(false);
    expect(mockRemove).toHaveBeenCalledTimes(3);
  });

  it('a failed upload aborts with a clear message', async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: 'denied' } });
    const res = await submitDriverVerification('u1', FIELDS,
      { licenceBytes: BYTES, selfieBytes: BYTES, carBytes: BYTES }, null);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/licence/i);
  });
});
