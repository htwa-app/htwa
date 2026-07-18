import { resolvePostAuthDestination } from '../../utils/authRouting';

describe('resolvePostAuthDestination', () => {
  it('routes to /id-verify when not verified, regardless of profile state', () => {
    expect(resolvePostAuthDestination({ isVerified: false, hasProfile: false })).toBe('/id-verify');
    expect(resolvePostAuthDestination({ isVerified: false, hasProfile: true })).toBe('/id-verify');
  });

  it('routes to /profile-setup when verified but without a profile', () => {
    expect(resolvePostAuthDestination({ isVerified: true, hasProfile: false })).toBe('/profile-setup');
  });

  it('routes to /(tabs) when verified and has a profile', () => {
    expect(resolvePostAuthDestination({ isVerified: true, hasProfile: true })).toBe('/(tabs)');
  });
});
