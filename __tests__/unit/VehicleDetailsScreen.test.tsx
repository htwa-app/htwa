/**
 * __tests__/unit/VehicleDetailsScreen.test.tsx
 *
 * Stage 23 — unit tests for app/vehicle-details.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockSingleImpl = jest.fn();
const mockUpsertImpl = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: (...a: unknown[]) => mockSingleImpl(...a) }) }),
      upsert: (...a: unknown[]) => mockUpsertImpl(...a),
    }),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
  mockSingleImpl.mockResolvedValue({ data: null, error: null });
  mockUpsertImpl.mockResolvedValue({ error: null });
});

import VehicleDetailsScreen from '../../app/vehicle-details';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('VehicleDetailsScreen — smoke', () => {
  it('renders without crashing', async () => {
    expect(() => render(<VehicleDetailsScreen />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('vehicle-details-screen')).toBeTruthy());
  });
});

// ─── Loading ──────────────────────────────────────────────────────────────────

describe('VehicleDetailsScreen — loading', () => {
  it('shows loading indicator before data loads', () => {
    mockSingleImpl.mockReturnValue(new Promise(() => {}));
    render(<VehicleDetailsScreen />);
    expect(screen.getByTestId('vehicle-loading')).toBeTruthy();
  });
});

// ─── Pre-fill ─────────────────────────────────────────────────────────────────

describe('VehicleDetailsScreen — pre-fill', () => {
  it('pre-fills form with existing vehicle details', async () => {
    mockSingleImpl.mockResolvedValue({
      data: {
        vehicle_details: {
          make: 'Toyota', model: 'Corolla', year: '2022',
          colour: 'Silver', seats: 5, hasAC: true, dashcam: false,
        },
      },
      error: null,
    });
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('Toyota')).toBeTruthy());
    expect(screen.getByDisplayValue('Corolla')).toBeTruthy();
    expect(screen.getByDisplayValue('2022')).toBeTruthy();
    expect(screen.getByDisplayValue('Silver')).toBeTruthy();
    expect(screen.getByTestId('seats-value').props.children).toBe(5);
  });
});

// ─── Stepper ──────────────────────────────────────────────────────────────────

describe('VehicleDetailsScreen — seats stepper', () => {
  it('starts at default 4 seats', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-value')).toBeTruthy());
    expect(screen.getByTestId('seats-value').props.children).toBe(4);
  });

  it('increments seats when + is pressed', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-increment')).toBeTruthy());
    fireEvent.press(screen.getByTestId('seats-increment'));
    expect(screen.getByTestId('seats-value').props.children).toBe(5);
  });

  it('decrements seats when - is pressed', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-decrement')).toBeTruthy());
    fireEvent.press(screen.getByTestId('seats-decrement'));
    expect(screen.getByTestId('seats-value').props.children).toBe(3);
  });

  it('does not go below minimum seats (2)', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-decrement')).toBeTruthy());
    for (let i = 0; i < 5; i++) {
      fireEvent.press(screen.getByTestId('seats-decrement'));
    }
    expect(screen.getByTestId('seats-value').props.children).toBe(2);
  });

  it('does not go above maximum seats (8)', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('seats-increment')).toBeTruthy());
    for (let i = 0; i < 10; i++) {
      fireEvent.press(screen.getByTestId('seats-increment'));
    }
    expect(screen.getByTestId('seats-value').props.children).toBe(8);
  });
});

// ─── Save ─────────────────────────────────────────────────────────────────────

describe('VehicleDetailsScreen — save', () => {
  it('calls upsert with vehicle_details payload', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('save-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(mockUpsertImpl).toHaveBeenCalled());
    const [payload, opts] = mockUpsertImpl.mock.calls[0];
    expect(payload.user_id).toBe('user-123');
    expect(payload.vehicle_details).toBeDefined();
    expect(opts).toEqual({ onConflict: 'user_id' });
  });

  it('navigates back after successful save', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('save-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('shows error when save fails', async () => {
    mockUpsertImpl.mockResolvedValue({ error: { message: 'DB error' } });
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('save-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('save-button'));
    await waitFor(() => expect(screen.getByTestId('save-error')).toBeTruthy());
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('VehicleDetailsScreen — navigation', () => {
  it('calls router.back() when back button is pressed', async () => {
    render(<VehicleDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalled();
  });
});
