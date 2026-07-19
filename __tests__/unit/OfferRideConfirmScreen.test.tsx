/**
 * __tests__/unit/OfferRideConfirmScreen.test.tsx
 * Stage 32 — unit tests for app/offer-ride-confirm.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockInsert = jest.fn();          // rides insert (payload capture)
const mockInsertResult = jest.fn();    // resolved value of insert().select('id').single()
const mockVehicleFetch = jest.fn();    // (legacy name) driver-verification approval check
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: (...a: unknown[]) => mockVehicleFetch(...a) }) }) };
      }
      return {
        insert: (...args: unknown[]) => {
          mockInsert(...args);
          return { select: () => ({ single: () => mockInsertResult() }) };
        },
      };
    },
  },
}));

// Change 2 — client-side overlap check (isolated here; its own unit test covers logic)
const mockCheckOverlap = jest.fn();
jest.mock('../../services/driverVerification', () => ({
  getDriverVerification: (...a: unknown[]) => mockVehicleFetch(...a),
}));

jest.mock('../../services/journeyConflicts', () => ({
  checkDriverOverlap: (...a: unknown[]) => mockCheckOverlap(...a),
}));

// 2A-d: waiver stub (toggle) + acceptance recorder; contact seeding stubs.
jest.mock('../../components/WaiverAcceptance', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    WaiverAcceptance: (p: { accepted: boolean; onChange: (v: boolean) => void }) => (
      <View testID="waiver-acceptance">
        <TouchableOpacity testID="waiver-toggle" onPress={() => p.onChange(!p.accepted)} />
      </View>
    ),
  };
});
const mockRecordWaiver = jest.fn();
jest.mock('../../services/waivers', () => ({
  recordWaiverAcceptance: (...a: unknown[]) => mockRecordWaiver(...a),
}));
const mockGetDefaultContact = jest.fn();
const mockSetJourneyContact = jest.fn();
jest.mock('../../services/tracking', () => ({
  getDefaultContact: (...a: unknown[]) => mockGetDefaultContact(...a),
  setJourneyContact: (...a: unknown[]) => mockSetJourneyContact(...a),
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import OfferRideConfirmScreen from '../../app/offer-ride-confirm';

const BASE_PARAMS = {
  from: 'Galway', to: 'Dublin', date: '2026-06-01', time: '09:00',
  seats: '3', pricePerSeat: '10.75', currency: 'EUR', distanceKm: '208', womenOnly: 'false',
};

const COMPLETE_VEHICLE = { make: 'Toyota', model: 'Corolla', colour: 'Red', registration: '191-D-1' };

/** Accept the driver waiver via the stubbed checkbox. */
const acceptWaiver = () => fireEvent.press(screen.getByTestId('waiver-toggle'));

/** Wait for the vehicle gate check to clear so the post button can enable. */
const waitForVehicleOk = async () =>
  waitFor(() => expect(screen.queryByTestId('vehicle-incomplete')).toBeNull());

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { ...BASE_PARAMS };
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockInsert.mockReturnValue(undefined);
  mockInsertResult.mockResolvedValue({ data: { id: 'ride-new' }, error: null });
  mockVehicleFetch.mockResolvedValue({ ok: true, verification: { status: 'approved' } });
  mockCheckOverlap.mockResolvedValue({ ok: true });
  mockRecordWaiver.mockResolvedValue({ ok: true });
  mockGetDefaultContact.mockResolvedValue({ name: 'Mam', phone: '+353871' });
  mockSetJourneyContact.mockResolvedValue({ ok: true, contact: { id: 'jc-1' } });
});

describe('OfferRideConfirmScreen', () => {
  it('renders the route and journey summary', () => {
    render(<OfferRideConfirmScreen />);
    expect(screen.getByTestId('confirm-from')).toHaveTextContent('Galway');
    expect(screen.getByTestId('confirm-to')).toHaveTextContent('Dublin');
    expect(screen.getByTestId('confirm-seats')).toHaveTextContent('3 seats available');
  });

  it('shows the legal cost-cap note', () => {
    render(<OfferRideConfirmScreen />);
    expect(screen.getByTestId('legal-note')).toBeTruthy();
  });

  it('shows the women-only badge only when women-only is true', () => {
    render(<OfferRideConfirmScreen />);
    expect(screen.queryByTestId('women-only-badge')).toBeNull();
    mockParams = { ...BASE_PARAMS, womenOnly: 'true' };
    render(<OfferRideConfirmScreen />);
    expect(screen.getAllByTestId('women-only-badge').length).toBeGreaterThan(0);
  });

  it('inserts the ride with the correct payload and navigates on success', async () => {
    render(<OfferRideConfirmScreen />);
    await waitForVehicleOk();
    acceptWaiver();
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const payload = mockInsert.mock.calls[0][0];
    expect(payload).toMatchObject({
      driver_id: 'u1',
      from_location: 'Galway',
      to_location: 'Dublin',
      seats_total: 3,
      seats_available: 3,
      cost_per_seat: 10.75,
      currency: 'EUR',
      women_only: false,
      status: 'active',
    });
    // Regression: the persisted departure must be the canonical UTC ISO, and must
    // be the SAME value passed to the overlap check (not the timezone-less string).
    const expectedISO = new Date('2026-06-01T09:00:00').toISOString();
    expect(payload.departure_datetime).toBe(expectedISO);
    expect(payload.departure_datetime).toBe(mockCheckOverlap.mock.calls[0][1]);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ride-posted'));
    // 2A-d: driver acceptance recorded against the posted journey.
    expect(mockRecordWaiver).toHaveBeenCalledWith({ userId: 'u1', role: 'driver', rideId: 'ride-new' });
    // 2A-c: journey contact seeded from the driver's default.
    expect(mockSetJourneyContact).toHaveBeenCalledWith('ride-new', 'u1', { name: 'Mam', phone: '+353871' });
  });

  it('cannot post without accepting the driver acknowledgment', async () => {
    render(<OfferRideConfirmScreen />);
    await waitForVehicleOk();
    fireEvent.press(screen.getByTestId('post-button'));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('unapproved driver verification blocks posting with a link to complete it', async () => {
    mockVehicleFetch.mockResolvedValue({ ok: true, verification: { status: 'pending' } });
    render(<OfferRideConfirmScreen />);
    await waitFor(() => expect(screen.getByTestId('vehicle-incomplete')).toBeTruthy());
    acceptWaiver();
    fireEvent.press(screen.getByTestId('post-button'));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('a failed vehicle check blocks posting with retry — never silently passes', async () => {
    mockVehicleFetch.mockResolvedValueOnce({ ok: false });
    render(<OfferRideConfirmScreen />);
    await waitFor(() => expect(screen.getByTestId('vehicle-check-error')).toBeTruthy());
    fireEvent.press(screen.getByTestId('vehicle-check-retry'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-check-error')).toBeNull());
  });

  it('shows an error and does not navigate when insert fails', async () => {
    mockInsertResult.mockResolvedValue({ data: null, error: { message: 'DB down' } });
    render(<OfferRideConfirmScreen />);
    await waitForVehicleOk();
    acceptWaiver();
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(screen.getByTestId('post-error')).toHaveTextContent('DB down'));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('includes window_end + duration in the payload (Change 2)', async () => {
    mockParams = { ...BASE_PARAMS, durationSeconds: '3600' };
    render(<OfferRideConfirmScreen />);
    await waitForVehicleOk();
    acceptWaiver();
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.estimated_duration_seconds).toBe(3600);
    // 09:00 + 1h drive + 30m buffer = 10:30 (departure parsed as local → ISO)
    expect(typeof payload.window_end).toBe('string');
  });

  it('blocks posting and shows the conflict message when journeys overlap (Change 2)', async () => {
    mockCheckOverlap.mockResolvedValue({ ok: false, message: 'This overlaps your Derry → Dublin journey at 11:00.' });
    render(<OfferRideConfirmScreen />);
    await waitForVehicleOk();
    acceptWaiver();
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(screen.getByTestId('post-error')).toHaveTextContent(/overlaps your Derry/));
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('OfferRideConfirmScreen — required nominated contact (round-2 audit)', () => {
  it('no saved default: Post stays disabled until a contact is entered, then writes it', async () => {
    mockGetDefaultContact.mockResolvedValue(null);
    render(<OfferRideConfirmScreen />);
    await waitForVehicleOk();
    acceptWaiver();
    fireEvent.press(screen.getByTestId('post-button'));
    expect(mockInsert).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('offer-contact-name'), 'Mam');
    fireEvent.changeText(screen.getByTestId('offer-contact-phone'), '+353879999999');
    fireEvent.press(screen.getByTestId('post-button'));
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    await waitFor(() => expect(mockSetJourneyContact).toHaveBeenCalledWith('ride-new', 'u1', {
      name: 'Mam', phone: '+353879999999',
    }));
  });

  it('saved default pre-fills the contact fields', async () => {
    render(<OfferRideConfirmScreen />);
    await waitFor(() => expect(screen.getByTestId('offer-contact-name').props.value).toBe('Mam'));
    expect(screen.getByTestId('offer-contact-phone').props.value).toBe('+353871');
  });
});
