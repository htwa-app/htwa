/**
 * __tests__/unit/devReset.test.ts
 * DEV-ONLY reset helper (utils/devReset.ts). __DEV__ is true under Jest, so the
 * helper performs its work here (the production no-op path is covered by the
 * __DEV__ guard in source).
 */

const mockSignOut = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut: () => mockSignOut() } },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { devResetAndSignOut } from '../../utils/devReset';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockSignOut.mockResolvedValue({ error: null });
});

describe('devResetAndSignOut', () => {
  it('signs out and wipes htwa:* + sb-* keys, leaving unrelated keys intact', async () => {
    await AsyncStorage.setItem('htwa:fullName', 'Jordan');
    await AsyncStorage.setItem('htwa:nominatedContact:name', 'Alex');
    await AsyncStorage.setItem('sb-adrwtjlphjrnrrqjkbfk-auth-token', 'token');
    await AsyncStorage.setItem('unrelated:key', 'keep me');

    await devResetAndSignOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    const remaining = await AsyncStorage.getAllKeys();
    expect(remaining).toEqual(['unrelated:key']);
  });

  it('throws when sign-out fails (does not leave a half-cleared state silently)', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'sign-out failed' } });
    await AsyncStorage.setItem('htwa:fullName', 'Jordan');

    await expect(devResetAndSignOut()).rejects.toMatchObject({ message: 'sign-out failed' });
    // sign-out failed before the wipe, so the cache is untouched (caller surfaces it).
    expect(await AsyncStorage.getItem('htwa:fullName')).toBe('Jordan');
  });

  it('is a no-op when there are no matching keys', async () => {
    await AsyncStorage.setItem('unrelated:key', 'keep me');
    await devResetAndSignOut();
    expect(await AsyncStorage.getAllKeys()).toEqual(['unrelated:key']);
  });
});
