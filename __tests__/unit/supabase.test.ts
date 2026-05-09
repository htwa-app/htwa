/**
 * __tests__/unit/supabase.test.ts
 *
 * Tests that lib/supabase.ts creates the Supabase client with the correct
 * configuration. We mock @supabase/supabase-js so no real network calls
 * are made and the test stays fast + offline-safe.
 *
 * Pattern: resetModules() + re-require mock ref in beforeEach so each test
 * gets a fresh module execution of lib/supabase.ts with its own mock instance.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-url-polyfill/auto', () => {
  // Side-effect import — nothing to mock, just prevent the real polyfill
  // from running in Node (where URL is already global).
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: {} })),
}));

// AsyncStorage is already mapped to a mock via jest.config.js moduleNameMapper.

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SupabaseCreateClientAuthOptions = {
  auth: {
    storage:            unknown;
    autoRefreshToken:   boolean;
    persistSession:     boolean;
    detectSessionInUrl: boolean;
  };
};

function getCreateClientOptions(mock: jest.Mock): SupabaseCreateClientAuthOptions {
  return mock.mock.calls[0][2] as SupabaseCreateClientAuthOptions;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('lib/supabase', () => {
  // Re-acquired after each resetModules() so the reference stays in sync
  // with the freshly-loaded module instance.
  let createClientMock: jest.Mock;

  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Re-require the mock module to get the fresh jest.fn() instance
    // that will be used when lib/supabase.ts is required inside each test.
    createClientMock = require('@supabase/supabase-js').createClient as jest.Mock;
    createClientMock.mockClear();
    // Reset env to defaults
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('calls createClient with the EXPO_PUBLIC_SUPABASE_URL env var', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    require('../../lib/supabase');

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock.mock.calls[0][0]).toBe('https://test.supabase.co');
  });

  it('calls createClient with the EXPO_PUBLIC_SUPABASE_ANON_KEY env var', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    require('../../lib/supabase');

    expect(createClientMock.mock.calls[0][1]).toBe('test-anon-key');
  });

  it('passes AsyncStorage as the auth storage adapter', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    require('../../lib/supabase');

    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const options = getCreateClientOptions(createClientMock);
    expect(options.auth.storage).toBe(AsyncStorage);
  });

  it('sets detectSessionInUrl to false', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    require('../../lib/supabase');

    const options = getCreateClientOptions(createClientMock);
    expect(options.auth.detectSessionInUrl).toBe(false);
  });

  it('enables autoRefreshToken', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    require('../../lib/supabase');

    const options = getCreateClientOptions(createClientMock);
    expect(options.auth.autoRefreshToken).toBe(true);
  });

  it('enables persistSession', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    require('../../lib/supabase');

    const options = getCreateClientOptions(createClientMock);
    expect(options.auth.persistSession).toBe(true);
  });

  it('throws when both required env vars are missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => require('../../lib/supabase')).toThrow(
      'Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
  });

  it('throws listing only the missing var when one is absent', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => require('../../lib/supabase')).toThrow(
      'Missing required environment variables: EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
  });

  it('exports the supabase client returned by createClient', () => {
    const fakeClient = { auth: { signIn: jest.fn() } };
    createClientMock.mockReturnValueOnce(fakeClient);

    process.env.EXPO_PUBLIC_SUPABASE_URL      = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const mod = require('../../lib/supabase');
    expect(mod.supabase).toBe(fakeClient);
  });
});
