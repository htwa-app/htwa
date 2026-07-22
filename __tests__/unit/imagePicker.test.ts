/**
 * __tests__/unit/imagePicker.test.ts
 *
 * services/imagePicker.ts — captureVerificationSelfie's simulator dev
 * fallback (round-2 hands-on fix). iOS Simulators have no camera; expo-
 * image-picker's launchCameraAsync throws "Camera not available on
 * simulator". __DEV__ is true under Jest (see devReset.test.ts), so the
 * fallback path is exercised directly here; the production path is verified
 * by explicitly flipping the mutable `global.__DEV__` (writable — see
 * react-native/jest/setup.js) to false, the same way devReset.test.ts's
 * sibling behaviour is implied by its own __DEV__ guard.
 */

const mockRequestCameraPermissions = jest.fn();
const mockLaunchCamera = jest.fn();
const mockRequestLibraryPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...a: unknown[]) => mockRequestCameraPermissions(...a),
  launchCameraAsync: (...a: unknown[]) => mockLaunchCamera(...a),
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) => mockRequestLibraryPermissions(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockLaunchLibrary(...a),
  CameraType: { front: 'front' },
}));

import { captureVerificationSelfie } from '../../services/imagePicker';

const CAMERA_UNAVAILABLE = new Error('Camera not available on simulator');

// __DEV__ is declared `const` in RN's ambient types (not reassignable as a
// bare identifier), but react-native/jest/setup.js defines the real
// global.__DEV__ property as writable — go through `global` with a cast to
// flip it for the production-path test below.
const devGlobal = global as unknown as { __DEV__: boolean };
const originalDev = devGlobal.__DEV__;

beforeEach(() => {
  jest.clearAllMocks();
  devGlobal.__DEV__ = true;
  mockRequestCameraPermissions.mockResolvedValue({ granted: true });
  mockRequestLibraryPermissions.mockResolvedValue({ granted: true });
});

afterEach(() => {
  devGlobal.__DEV__ = originalDev;
});

describe('captureVerificationSelfie', () => {
  it('returns { source: "camera" } on a normal live capture', async () => {
    mockLaunchCamera.mockResolvedValue({ canceled: false, assets: [{ base64: 'AQID' }] });
    const res = await captureVerificationSelfie();
    expect(res?.source).toBe('camera');
    expect(res?.bytes).toBeInstanceOf(Uint8Array);
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  it('returns null (no fallback attempted) when the user cancels the camera', async () => {
    mockLaunchCamera.mockResolvedValue({ canceled: true });
    const res = await captureVerificationSelfie();
    expect(res).toBeNull();
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  it('returns null when camera permission is denied, without attempting anything else', async () => {
    mockRequestCameraPermissions.mockResolvedValue({ granted: false });
    const res = await captureVerificationSelfie();
    expect(res).toBeNull();
    expect(mockLaunchCamera).not.toHaveBeenCalled();
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  describe('in __DEV__ (simulator fallback)', () => {
    it('falls back to the photo library when the camera throws, tagged library-dev-fallback', async () => {
      mockLaunchCamera.mockRejectedValue(CAMERA_UNAVAILABLE);
      mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ base64: 'BAUG' }] });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await captureVerificationSelfie();

      expect(res?.source).toBe('library-dev-fallback');
      expect(res?.bytes).toBeInstanceOf(Uint8Array);
      expect(mockLaunchLibrary).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/fallback/i), expect.anything());
      warnSpy.mockRestore();
    });

    it('returns null if the library fallback is itself cancelled', async () => {
      mockLaunchCamera.mockRejectedValue(CAMERA_UNAVAILABLE);
      mockLaunchLibrary.mockResolvedValue({ canceled: true });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const res = await captureVerificationSelfie();
      expect(res).toBeNull();
      warnSpy.mockRestore();
    });
  });

  describe('outside __DEV__ (production)', () => {
    it('rethrows the camera error — no fallback, camera-only stays enforced', async () => {
      devGlobal.__DEV__ = false;
      mockLaunchCamera.mockRejectedValue(CAMERA_UNAVAILABLE);

      await expect(captureVerificationSelfie()).rejects.toThrow('Camera not available on simulator');
      expect(mockLaunchLibrary).not.toHaveBeenCalled();
    });
  });
});
