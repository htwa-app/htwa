/**
 * __tests__/unit/location.test.ts
 * Stage 47 — unit tests for services/location.ts
 */

const mockRequestPermissions = jest.fn();
const mockWatchPosition       = jest.fn();
const mockGetCurrentPosition  = jest.fn();

jest.mock('expo-location', () => ({
  Accuracy: { High: 6 },
  requestForegroundPermissionsAsync: (...a: unknown[]) => mockRequestPermissions(...a),
  watchPositionAsync:                (...a: unknown[]) => mockWatchPosition(...a),
  getCurrentPositionAsync:           (...a: unknown[]) => mockGetCurrentPosition(...a),
}));

const mockChannelSend    = jest.fn().mockResolvedValue(undefined);
const mockRemoveChannel  = jest.fn().mockResolvedValue(undefined);
jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: () => ({ send: mockChannelSend }),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockWatchPosition.mockResolvedValue({ remove: jest.fn() });
  mockGetCurrentPosition.mockResolvedValue({
    coords: { latitude: 53.3498, longitude: -6.2603, accuracy: 5 },
    timestamp: 1000,
  });
});

import { startTracking, stopTracking, getCurrentLocation } from '../../services/location';

describe('startTracking', () => {
  it('requests foreground permissions', async () => {
    await startTracking('trip-1');
    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it('calls watchPositionAsync with correct options', async () => {
    await startTracking('trip-2');
    expect(mockWatchPosition).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: 6, timeInterval: 5000 }),
      expect.any(Function),
    );
  });

  it('throws when permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    await expect(startTracking('trip-3')).rejects.toThrow('Location permission denied');
  });
});

describe('stopTracking', () => {
  it('calls remove on the subscription after startTracking', async () => {
    const mockRemove = jest.fn();
    mockWatchPosition.mockResolvedValue({ remove: mockRemove });
    await startTracking('trip-stop');
    stopTracking();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('does not throw when called before startTracking', () => {
    // Ensure no active channel before calling stop
    expect(() => stopTracking()).not.toThrow();
  });
});

describe('getCurrentLocation', () => {
  it('returns lat/lng/accuracy/timestamp', async () => {
    const loc = await getCurrentLocation();
    expect(loc.lat).toBeCloseTo(53.3498);
    expect(loc.lng).toBeCloseTo(-6.2603);
    expect(loc.accuracy).toBe(5);
    expect(loc.timestamp).toBe(1000);
  });

  it('throws when permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    await expect(getCurrentLocation()).rejects.toThrow('Location permission denied');
  });
});
