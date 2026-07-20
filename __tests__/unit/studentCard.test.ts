/**
 * __tests__/unit/studentCard.test.ts
 * Block 6 — student-card name match + upload.
 */
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockUpsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({
      upload: (...a: unknown[]) => mockUpload(...a),
      remove: (...a: unknown[]) => mockRemove(...a),
    }) },
    // uploadStudentCard now upserts (onConflict user_id) instead of update().eq().
    from: () => ({ upsert: (...a: unknown[]) => mockUpsert(...a) }),
  },
}));

import { normalizeName, namesLooselyMatch, uploadStudentCard } from '../../services/studentCard';

describe('normalizeName', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeName('Áine  O’Brien-Murphy')).toBe('aine o brien murphy');
    expect(normalizeName('  JANE   DOE ')).toBe('jane doe');
  });
});

describe('namesLooselyMatch', () => {
  it('matches identical names', () => {
    expect(namesLooselyMatch('Jane Doe', 'jane doe')).toBe(true);
  });
  it('matches when one has an extra middle name', () => {
    expect(namesLooselyMatch('Jane Doe', 'Jane Mary Doe')).toBe(true);
  });
  it('matches accented vs unaccented', () => {
    expect(namesLooselyMatch('Áine Murphy', 'Aine Murphy')).toBe(true);
  });
  it('does not match different people', () => {
    expect(namesLooselyMatch('Jane Doe', 'John Smith')).toBe(false);
  });
  it('returns false for empty input', () => {
    expect(namesLooselyMatch('', 'Jane Doe')).toBe(false);
  });
});

describe('uploadStudentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
  });

  it('uploads to the user folder and upserts status pending (manual review)', async () => {
    const res = await uploadStudentCard('u1', new Uint8Array([1, 2, 3]));
    expect(res).toEqual({ ok: true, status: 'pending', path: 'u1/student-card.jpg' });
    expect(mockUpload).toHaveBeenCalledWith('u1/student-card.jpg', expect.anything(), expect.objectContaining({ upsert: true }));
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', university_verification_status: 'pending', student_card_url: 'u1/student-card.jpg' }),
      expect.objectContaining({ onConflict: 'user_id' }),
    );
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('returns an error when the upload fails', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'upload failed' } });
    const res = await uploadStudentCard('u1', new Uint8Array([1]));
    expect(res.ok).toBe(false);
    expect(res.status).toBe('unverified');
  });

  it('rolls back the uploaded file when the profile write fails (no orphan)', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db failed' } });
    const res = await uploadStudentCard('u1', new Uint8Array([1]));
    expect(res.ok).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith(['u1/student-card.jpg']);
  });
});
