/**
 * __tests__/unit/connectivity.test.ts
 * Stage 69 — unit tests for utils/connectivity.ts
 */
import NetInfo from '@react-native-community/netinfo';
import { isConnected, onConnectivityChange } from '../../utils/connectivity';

beforeEach(() => jest.clearAllMocks());

describe('isConnected', () => {
  it('returns true when NetInfo reports a connection', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: true });
    await expect(isConnected()).resolves.toBe(true);
  });

  it('returns false when offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
    await expect(isConnected()).resolves.toBe(false);
  });

  it('treats an unknown/null state as offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: null });
    await expect(isConnected()).resolves.toBe(false);
  });

  it('returns false if NetInfo throws', async () => {
    (NetInfo.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(isConnected()).resolves.toBe(false);
  });
});

describe('onConnectivityChange', () => {
  it('subscribes and forwards the connected boolean', () => {
    let captured: ((s: { isConnected: boolean }) => void) | undefined;
    (NetInfo.addEventListener as jest.Mock).mockImplementationOnce((cb) => {
      captured = cb;
      return jest.fn();
    });
    const listener = jest.fn();
    const unsub = onConnectivityChange(listener);
    captured?.({ isConnected: true });
    expect(listener).toHaveBeenCalledWith(true);
    expect(typeof unsub).toBe('function');
  });
});
