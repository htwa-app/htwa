import { resolvePostAuthDestination } from '../../utils/authRouting';

describe('resolvePostAuthDestination', () => {
  it('routes to /id-verify when never submitted (null), regardless of profile state', () => {
    expect(resolvePostAuthDestination({ verificationStatus: null, hasProfile: false })).toBe('/id-verify');
    expect(resolvePostAuthDestination({ verificationStatus: null, hasProfile: true })).toBe('/id-verify');
  });

  it('routes to /profile-setup once submitted (any status) but without a profile', () => {
    expect(resolvePostAuthDestination({ verificationStatus: 'pending', hasProfile: false })).toBe('/profile-setup');
    expect(resolvePostAuthDestination({ verificationStatus: 'approved', hasProfile: false })).toBe('/profile-setup');
    expect(resolvePostAuthDestination({ verificationStatus: 'rejected', hasProfile: false })).toBe('/profile-setup');
  });

  it('routes to /(tabs) once submitted (any status) and has a profile — pending/rejected still browse freely', () => {
    expect(resolvePostAuthDestination({ verificationStatus: 'pending', hasProfile: true })).toBe('/(tabs)');
    expect(resolvePostAuthDestination({ verificationStatus: 'approved', hasProfile: true })).toBe('/(tabs)');
    expect(resolvePostAuthDestination({ verificationStatus: 'rejected', hasProfile: true })).toBe('/(tabs)');
  });
});
