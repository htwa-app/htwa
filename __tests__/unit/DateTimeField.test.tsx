/**
 * __tests__/unit/DateTimeField.test.tsx
 *
 * Regression test for the "Done without scrolling" bug (hands-on round 2
 * follow-up): the iOS spinner opens already showing today's date / the
 * current time (toDate's fallback for an empty value), but the native
 * DateTimePicker only fires onChange when the user actually scrolls a wheel.
 * Tapping "Done" without touching it used to just close the sheet with
 * nothing committed, silently rejecting "post/search for right now" even
 * though that's exactly what was on screen.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

// A controllable stand-in for the native picker: exposes the props it was
// given so tests can fire onChange the way a real scroll would, without
// depending on the native module.
let lastPickerProps: { value: Date; onChange: (e: { type: string }, d?: Date) => void } | null = null;
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { value: Date; onChange: (e: { type: string }, d?: Date) => void; testID?: string }) => {
      lastPickerProps = props;
      return <View testID={props.testID} />;
    },
  };
});

import { DateTimeField } from '../../components/DateTimeField';

/** Safe Platform.OS override — jest-expo's Platform.OS is a plain value, not
 *  a getter, so jest.spyOn(..., 'get') doesn't work (see CLAUDE.md lessons). */
function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true });
}

const originalOS = Platform.OS;
afterEach(() => { setPlatform(originalOS as 'ios' | 'android'); lastPickerProps = null; });

describe('DateTimeField — iOS Done without ever scrolling (the bug)', () => {
  beforeEach(() => setPlatform('ios'));

  it('time: commits the current time shown on the wheel when Done is tapped untouched', () => {
    const onChange = jest.fn();
    render(<DateTimeField mode="time" value="" onChange={onChange} placeholder="Pick a time" testID="time-field" />);

    fireEvent.press(screen.getByTestId('time-field'));
    // Never fire the picker's onChange — simulates never touching the wheel.
    fireEvent.press(screen.getByTestId('time-field-done'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0][0] as string;
    expect(committed).toMatch(/^\d{2}:\d{2}$/);
  });

  it('date: commits today\'s date shown on the wheel when Done is tapped untouched', () => {
    const onChange = jest.fn();
    render(<DateTimeField mode="date" value="" onChange={onChange} placeholder="Pick a date" testID="date-field" />);

    fireEvent.press(screen.getByTestId('date-field'));
    fireEvent.press(screen.getByTestId('date-field-done'));

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(onChange).toHaveBeenCalledWith(expected);
  });

  it('still commits the scrolled value correctly when the user DID interact', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <DateTimeField mode="time" value="" onChange={onChange} placeholder="Pick a time" testID="time-field" />,
    );

    fireEvent.press(screen.getByTestId('time-field'));
    lastPickerProps?.onChange({ type: 'set' }, new Date(2026, 0, 1, 14, 30));
    expect(onChange).toHaveBeenCalledWith('14:30'); // committed immediately, same as today

    // Mimic the real parent screen re-rendering with the now-committed value
    // (a real parent holds state; this isolated test doesn't, so it's done
    // explicitly) before Done is pressed.
    onChange.mockClear();
    rerender(<DateTimeField mode="time" value="14:30" onChange={onChange} placeholder="Pick a time" testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field-done'));

    expect(onChange).toHaveBeenCalledWith('14:30');
  });

  it('tapping the backdrop cancels without committing anything', () => {
    const onChange = jest.fn();
    render(<DateTimeField mode="time" value="" onChange={onChange} placeholder="Pick a time" testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    fireEvent.press(screen.getByTestId('time-field-backdrop'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a prior selection re-opens the wheel on that value, not on now', () => {
    const onChange = jest.fn();
    render(<DateTimeField mode="time" value="09:15" onChange={onChange} placeholder="Pick a time" testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    fireEvent.press(screen.getByTestId('time-field-done'));
    expect(onChange).toHaveBeenCalledWith('09:15');
  });
});

describe('DateTimeField — Android (unaffected by the fix)', () => {
  beforeEach(() => setPlatform('android'));

  it('commits immediately on the native dialog\'s onChange, no Done button involved', () => {
    const onChange = jest.fn();
    render(<DateTimeField mode="time" value="" onChange={onChange} placeholder="Pick a time" testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    lastPickerProps?.onChange({ type: 'set' }, new Date(2026, 0, 1, 8, 5));
    expect(onChange).toHaveBeenCalledWith('08:05');
    expect(screen.queryByTestId('time-field-done')).toBeNull();
  });

  it('dismissing (cancel) does not commit', () => {
    const onChange = jest.fn();
    render(<DateTimeField mode="time" value="" onChange={onChange} placeholder="Pick a time" testID="time-field" />);
    fireEvent.press(screen.getByTestId('time-field'));
    lastPickerProps?.onChange({ type: 'dismissed' });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DateTimeField — display', () => {
  beforeEach(() => setPlatform('ios'));

  it('shows the placeholder when empty, and the formatted value once set', () => {
    render(<DateTimeField mode="date" value="" onChange={jest.fn()} placeholder="Pick a date" testID="date-field" />);
    expect(screen.getByTestId('date-field-value')).toHaveTextContent('Pick a date');
  });
});
