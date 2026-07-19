/**
 * __tests__/unit/signOut.test.ts
 * Round-2 fix #3 — utils/signOut.ts: sign out with zero residue.
 */

const mockRemoveAllChannels = jest.fn();
const mockSignOut = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    removeAllChannels: (...a: unknown[]) => mockRemoveAllChannels(...a),
    auth: { signOut: (...a: unknown[]) => mockSignOut(...a) },
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOutAndClear } from '../../utils/signOut';

beforeEach(async () => {
  jest.clearAllMocks();
  mockRemoveAllChannels.mockResolvedValue(['ok']);
  mockSignOut.mockResolvedValue({ error: null });
  await AsyncStorage.clear();
});

describe('signOutAndClear', () => {
  it('tears down channels, signs out, and wipes cached app + auth keys', async () => {
    await AsyncStorage.setItem('htwa:profile-cache', '{"name":"Old User"}');
    await AsyncStorage.setItem('sb-project-auth-token', 'token');
    await AsyncStorage.setItem('unrelated-key', 'keep-me');

    await signOutAndClear();

    expect(mockRemoveAllChannels).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('htwa:profile-cache')).toBeNull();
    expect(await AsyncStorage.getItem('sb-project-auth-token')).toBeNull();
    expect(await AsyncStorage.getItem('unrelated-key')).toBe('keep-me');
  });

  it('throws when Supabase sign-out fails (caller surfaces it) and keeps cache intact', async () => {
    await AsyncStorage.setItem('htwa:profile-cache', 'x');
    mockSignOut.mockResolvedValue({ error: { message: 'network' } });
    await expect(signOutAndClear()).rejects.toBeTruthy();
    // Cache untouched — the user is still signed in, clearing would corrupt state.
    expect(await AsyncStorage.getItem('htwa:profile-cache')).toBe('x');
  });

  it('a channel-teardown failure does not block the sign-out', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRemoveAllChannels.mockRejectedValue(new Error('socket'));
    await signOutAndClear();
    expect(mockSignOut).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
