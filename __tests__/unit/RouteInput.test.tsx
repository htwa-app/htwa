/**
 * __tests__/unit/RouteInput.test.tsx
 *
 * Tests for components/RouteInput.tsx, including the Places autocomplete
 * upgrade (20 Jul) — debounced suggestions, selection resolves coords via
 * services/places, and graceful no-op when the service reports no_key.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockAutocomplete = jest.fn();
const mockGetCoords = jest.fn();
jest.mock('../../services/places', () => ({
  autocompletePlaces: (...a: unknown[]) => mockAutocomplete(...a),
  getPlaceCoords: (...a: unknown[]) => mockGetCoords(...a),
  newPlacesSessionToken: () => 'fixed-session-token',
}));

import { RouteInput } from '../../components/RouteInput';

beforeEach(() => {
  jest.clearAllMocks();
  mockAutocomplete.mockResolvedValue({ ok: true, suggestions: [] });
  mockGetCoords.mockResolvedValue({ ok: true, lat: 53.27, lng: -9.05 });
});

describe('RouteInput', () => {
  it('renders both fields with current values', () => {
    render(
      <RouteInput from="Galway" to="Dublin" onFromChange={jest.fn()} onToChange={jest.fn()} />,
    );
    expect(screen.getByTestId('route-input-from').props.value).toBe('Galway');
    expect(screen.getByTestId('route-input-to').props.value).toBe('Dublin');
  });

  it('calls onFromChange when the from field changes', () => {
    const onFromChange = jest.fn();
    render(<RouteInput from="" to="" onFromChange={onFromChange} onToChange={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'Cork');
    expect(onFromChange).toHaveBeenCalledWith('Cork');
  });

  it('calls onToChange when the to field changes', () => {
    const onToChange = jest.fn();
    render(<RouteInput from="" to="" onFromChange={jest.fn()} onToChange={onToChange} />);
    fireEvent.changeText(screen.getByTestId('route-input-to'), 'Belfast');
    expect(onToChange).toHaveBeenCalledWith('Belfast');
  });

  it('swaps from and to when the swap button is pressed', () => {
    const onFromChange = jest.fn();
    const onToChange = jest.fn();
    render(
      <RouteInput from="Galway" to="Dublin" onFromChange={onFromChange} onToChange={onToChange} />,
    );
    fireEvent.press(screen.getByTestId('route-input-swap'));
    expect(onFromChange).toHaveBeenCalledWith('Dublin');
    expect(onToChange).toHaveBeenCalledWith('Galway');
  });

  it('renders prominent field labels when provided', () => {
    render(
      <RouteInput
        from=""
        to=""
        onFromChange={jest.fn()}
        onToChange={jest.fn()}
        fromLabel="Departing from"
        toLabel="Destination"
      />,
    );
    expect(screen.getByText('Departing from')).toBeTruthy();
    expect(screen.getByText('Destination')).toBeTruthy();
  });

  it('shows custom placeholders', () => {
    render(
      <RouteInput
        from=""
        to=""
        onFromChange={jest.fn()}
        onToChange={jest.fn()}
        fromPlaceholder="Pickup"
        toPlaceholder="Dropoff"
      />,
    );
    expect(screen.getByPlaceholderText('Pickup')).toBeTruthy();
    expect(screen.getByPlaceholderText('Dropoff')).toBeTruthy();
  });
});

// ─── Places autocomplete ──────────────────────────────────────────────────────

describe('RouteInput — Places autocomplete', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('debounces and calls autocompletePlaces after typing stops (from field)', async () => {
    mockAutocomplete.mockResolvedValue({
      ok: true,
      suggestions: [{ placeId: 'p1', description: 'Galway, Ireland', mainText: 'Galway', secondaryText: 'Ireland' }],
    });
    render(<RouteInput from="" to="" onFromChange={jest.fn()} onToChange={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'Gal');
    expect(mockAutocomplete).not.toHaveBeenCalled(); // not yet — still debouncing
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(mockAutocomplete).toHaveBeenCalledWith('Gal', 'fixed-session-token'));
  });

  it('does not search for a query shorter than the minimum length', async () => {
    render(<RouteInput from="" to="" onFromChange={jest.fn()} onToChange={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'G');
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockAutocomplete).not.toHaveBeenCalled();
  });

  it('renders suggestions under the focused field after the debounce resolves', async () => {
    mockAutocomplete.mockResolvedValue({
      ok: true,
      suggestions: [{ placeId: 'p1', description: 'Galway, Ireland', mainText: 'Galway', secondaryText: 'Ireland' }],
    });
    render(<RouteInput from="" to="" onFromChange={jest.fn()} onToChange={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'Gal');
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByTestId('route-input-from-suggestion-p1')).toBeTruthy());
    expect(screen.getByText('Galway')).toBeTruthy();
    expect(screen.getByText('Ireland')).toBeTruthy();
  });

  it('selecting a suggestion fills the text and resolves coords via onFromPlaceSelect', async () => {
    mockAutocomplete.mockResolvedValue({
      ok: true,
      suggestions: [{ placeId: 'p1', description: 'Galway, Ireland', mainText: 'Galway', secondaryText: 'Ireland' }],
    });
    mockGetCoords.mockResolvedValue({ ok: true, lat: 53.27, lng: -9.05 });
    const onFromChange = jest.fn();
    const onFromPlaceSelect = jest.fn();
    render(
      <RouteInput
        from="" to=""
        onFromChange={onFromChange} onToChange={jest.fn()}
        onFromPlaceSelect={onFromPlaceSelect}
      />,
    );
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'Gal');
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByTestId('route-input-from-suggestion-p1')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('route-input-from-suggestion-p1'));
    });

    expect(onFromChange).toHaveBeenCalledWith('Galway, Ireland');
    await waitFor(() => expect(onFromPlaceSelect).toHaveBeenCalledWith({ lat: 53.27, lng: -9.05 }));
    // Dropdown closes after selection.
    expect(screen.queryByTestId('route-input-from-suggestion-p1')).toBeNull();
  });

  it('selecting a suggestion for the "to" field calls onToPlaceSelect, not onFromPlaceSelect', async () => {
    mockAutocomplete.mockResolvedValue({
      ok: true,
      suggestions: [{ placeId: 'p2', description: 'Dublin, Ireland', mainText: 'Dublin', secondaryText: 'Ireland' }],
    });
    const onFromPlaceSelect = jest.fn();
    const onToPlaceSelect = jest.fn();
    render(
      <RouteInput
        from="" to=""
        onFromChange={jest.fn()} onToChange={jest.fn()}
        onFromPlaceSelect={onFromPlaceSelect}
        onToPlaceSelect={onToPlaceSelect}
      />,
    );
    fireEvent.changeText(screen.getByTestId('route-input-to'), 'Dub');
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByTestId('route-input-to-suggestion-p2')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('route-input-to-suggestion-p2'));
    });
    await waitFor(() => expect(onToPlaceSelect).toHaveBeenCalledWith({ lat: 53.27, lng: -9.05 }));
    expect(onFromPlaceSelect).not.toHaveBeenCalled();
  });

  it('shows no dropdown at all when the service reports no_key (graceful degradation)', async () => {
    mockAutocomplete.mockResolvedValue({ ok: false, reason: 'no_key' });
    render(<RouteInput from="" to="" onFromChange={jest.fn()} onToChange={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'Gal');
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(mockAutocomplete).toHaveBeenCalled());
    expect(screen.queryByTestId('route-input-from-suggestions')).toBeNull();
  });

  it('swapping fields clears any open suggestions', async () => {
    mockAutocomplete.mockResolvedValue({
      ok: true,
      suggestions: [{ placeId: 'p1', description: 'Galway, Ireland', mainText: 'Galway', secondaryText: 'Ireland' }],
    });
    render(<RouteInput from="Galway" to="Dublin" onFromChange={jest.fn()} onToChange={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('route-input-from'), 'Gal');
    await act(async () => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByTestId('route-input-from-suggestion-p1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('route-input-swap'));
    expect(screen.queryByTestId('route-input-from-suggestion-p1')).toBeNull();
  });
});
