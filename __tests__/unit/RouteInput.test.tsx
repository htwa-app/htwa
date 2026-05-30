/**
 * __tests__/unit/RouteInput.test.tsx
 *
 * Stage 27 — unit tests for components/RouteInput.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

// Mock fetch for Places autocomplete
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Default: empty suggestions
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ predictions: [] }),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

import { RouteInput } from '../../components/RouteInput';

// ─── Default props helper ─────────────────────────────────────────────────────

function renderDefault(overrides: Partial<React.ComponentProps<typeof RouteInput>> = {}) {
  const onFromChange = jest.fn();
  const onToChange   = jest.fn();
  return render(
    <RouteInput
      from=""
      to=""
      onFromChange={onFromChange}
      onToChange={onToChange}
      {...overrides}
    />,
  );
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('RouteInput — smoke', () => {
  it('renders without crashing', () => {
    expect(() => renderDefault()).not.toThrow();
  });

  it('renders both From and To inputs', () => {
    renderDefault();
    expect(screen.getByTestId('from-input')).toBeTruthy();
    expect(screen.getByTestId('to-input')).toBeTruthy();
  });

  it('renders the swap button', () => {
    renderDefault();
    expect(screen.getByTestId('swap-button')).toBeTruthy();
  });

  it('renders the From (green) dot', () => {
    renderDefault();
    expect(screen.getByTestId('from-dot')).toBeTruthy();
  });

  it('renders the To (orange) dot', () => {
    renderDefault();
    expect(screen.getByTestId('to-dot')).toBeTruthy();
  });
});

// ─── Controlled values ────────────────────────────────────────────────────────

describe('RouteInput — controlled values', () => {
  it('shows the from value', () => {
    renderDefault({ from: 'Dublin' });
    expect(screen.getByDisplayValue('Dublin')).toBeTruthy();
  });

  it('shows the to value', () => {
    renderDefault({ to: 'Galway' });
    expect(screen.getByDisplayValue('Galway')).toBeTruthy();
  });
});

// ─── Callbacks ────────────────────────────────────────────────────────────────

describe('RouteInput — callbacks', () => {
  it('calls onFromChange when from input changes', () => {
    const onFromChange = jest.fn();
    renderDefault({ onFromChange });
    fireEvent.changeText(screen.getByTestId('from-input'), 'Cork');
    expect(onFromChange).toHaveBeenCalledWith('Cork');
  });

  it('calls onToChange when to input changes', () => {
    const onToChange = jest.fn();
    renderDefault({ onToChange });
    fireEvent.changeText(screen.getByTestId('to-input'), 'Limerick');
    expect(onToChange).toHaveBeenCalledWith('Limerick');
  });

  it('swaps from and to when swap button is pressed', () => {
    const onFromChange = jest.fn();
    const onToChange   = jest.fn();
    renderDefault({ from: 'Dublin', to: 'Galway', onFromChange, onToChange });
    fireEvent.press(screen.getByTestId('swap-button'));
    expect(onFromChange).toHaveBeenCalledWith('Galway');
    expect(onToChange).toHaveBeenCalledWith('Dublin');
  });
});

// ─── Autocomplete dropdown ────────────────────────────────────────────────────

describe('RouteInput — autocomplete', () => {
  it('shows from-dropdown after debounce when suggestions are returned', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [
          { place_id: 'p1', description: 'Dublin, Ireland' },
          { place_id: 'p2', description: 'Dublin Airport, Ireland' },
        ],
      }),
    });
    renderDefault();
    fireEvent.changeText(screen.getByTestId('from-input'), 'Dub');
    // Advance debounce timer
    await act(async () => { jest.advanceTimersByTime(350); });
    await waitFor(() => expect(screen.getByTestId('from-dropdown')).toBeTruthy());
    expect(screen.getByTestId('from-suggestion-p1')).toBeTruthy();
  });

  it('selects a suggestion and calls onFromSelect', async () => {
    const onFromChange = jest.fn();
    const onFromSelect = jest.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [{ place_id: 'place-99', description: 'Dublin, Ireland' }],
      }),
    });
    renderDefault({ onFromChange, onFromSelect });
    fireEvent.changeText(screen.getByTestId('from-input'), 'Dub');
    await act(async () => { jest.advanceTimersByTime(350); });
    await waitFor(() => screen.getByTestId('from-suggestion-place-99'));
    fireEvent.press(screen.getByTestId('from-suggestion-place-99'));
    expect(onFromSelect).toHaveBeenCalledWith('Dublin, Ireland', 'place-99');
    expect(onFromChange).toHaveBeenCalledWith('Dublin, Ireland');
  });

  it('hides from-dropdown after selecting a suggestion', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [{ place_id: 'p-x', description: 'Cork, Ireland' }],
      }),
    });
    renderDefault();
    fireEvent.changeText(screen.getByTestId('from-input'), 'Cor');
    await act(async () => { jest.advanceTimersByTime(350); });
    await waitFor(() => screen.getByTestId('from-dropdown'));
    fireEvent.press(screen.getByTestId('from-suggestion-p-x'));
    await waitFor(() => expect(screen.queryByTestId('from-dropdown')).toBeNull());
  });
});

// ─── Disabled state ───────────────────────────────────────────────────────────

describe('RouteInput — disabled', () => {
  it('disables both inputs when disabled=true', () => {
    renderDefault({ disabled: true });
    expect(screen.getByTestId('from-input').props.editable).toBe(false);
    expect(screen.getByTestId('to-input').props.editable).toBe(false);
  });
});
