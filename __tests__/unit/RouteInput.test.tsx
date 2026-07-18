/**
 * __tests__/unit/RouteInput.test.tsx
 *
 * Tests for components/RouteInput.tsx (Maps-deferred stub).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

import { RouteInput } from '../../components/RouteInput';

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
