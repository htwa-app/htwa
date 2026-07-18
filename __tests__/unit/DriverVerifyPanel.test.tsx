/**
 * __tests__/unit/DriverVerifyPanel.test.tsx
 * 2A-b — tests for components/DriverVerifyPanel.tsx ("Verify your driver").
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockRpc = jest.fn();
const mockCreateSignedUrl = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a),
    storage: { from: () => ({ createSignedUrl: (...a: unknown[]) => mockCreateSignedUrl(...a) }) },
  },
}));

import { DriverVerifyPanel } from '../../components/DriverVerifyPanel';

const DISCLOSURE = {
  ok: true,
  driver: { full_name: 'Aoife Ryan', gender: 'female', selfie_url: 'd1/selfie-1.jpg' },
  vehicle: { make: 'Toyota', model: 'Corolla', colour: 'Red', registration: '191-D-12345' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ data: DISCLOSURE, error: null });
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/selfie.jpg' }, error: null });
});

describe('DriverVerifyPanel', () => {
  it('shows photo, name, gender and full vehicle details', async () => {
    render(<DriverVerifyPanel rideId="ride-1" />);
    await waitFor(() => expect(screen.getByTestId('driver-verify-name')).toBeTruthy());
    expect(screen.getByText('Aoife Ryan')).toBeTruthy();
    expect(screen.getByText('Female')).toBeTruthy();
    expect(screen.getByTestId('driver-photo').props.source.uri).toBe('https://signed/selfie.jpg');
    expect(screen.getByText('Red Toyota Corolla')).toBeTruthy();
    expect(screen.getByText('191-D-12345')).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledWith('get_driver_disclosure', { p_ride_id: 'ride-1' });
  });

  it('renders nothing at all for a non-booked viewer (forbidden)', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, reason: 'forbidden' }, error: null });
    render(<DriverVerifyPanel rideId="ride-1" />);
    await waitFor(() => expect(screen.queryByTestId('driver-verify-panel')).toBeNull());
  });

  it('a failed selfie signing still shows the rest of the disclosure', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });
    render(<DriverVerifyPanel rideId="ride-1" />);
    await waitFor(() => expect(screen.getByTestId('driver-verify-name')).toBeTruthy());
    expect(screen.getByTestId('driver-photo-missing')).toBeTruthy();
    expect(screen.getByText('191-D-12345')).toBeTruthy();
  });

  it('no selfie on file shows the fallback avatar', async () => {
    mockRpc.mockResolvedValue({
      data: { ...DISCLOSURE, driver: { ...DISCLOSURE.driver, selfie_url: null } },
      error: null,
    });
    render(<DriverVerifyPanel rideId="ride-1" />);
    await waitFor(() => expect(screen.getByTestId('driver-photo-missing')).toBeTruthy());
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('missing vehicle details shows an explicit not-provided state', async () => {
    mockRpc.mockResolvedValue({ data: { ...DISCLOSURE, vehicle: {} }, error: null });
    render(<DriverVerifyPanel rideId="ride-1" />);
    await waitFor(() => expect(screen.getByTestId('driver-verify-no-vehicle')).toBeTruthy());
  });

  it('an RPC error shows retry, and retry recovers', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    render(<DriverVerifyPanel rideId="ride-1" />);
    await waitFor(() => expect(screen.getByTestId('driver-verify-retry')).toBeTruthy());
    fireEvent.press(screen.getByTestId('driver-verify-retry'));
    await waitFor(() => expect(screen.getByTestId('driver-verify-name')).toBeTruthy());
  });
});
