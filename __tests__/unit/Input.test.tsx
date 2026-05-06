/**
 * __tests__/unit/Input.test.tsx
 *
 * Tests for components/Input.tsx (DESIGN-SPEC §6.3).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Input } from '../../components/Input';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Input — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<Input />)).not.toThrow();
  });
});

// ─── Label and error text ───────────────────────────���────────────────────────

describe('Input — label and error', () => {
  it('renders the label when provided', () => {
    render(<Input label="Email address" />);
    expect(screen.getByText('Email address')).toBeTruthy();
  });

  it('does not render a label when omitted', () => {
    render(<Input />);
    expect(screen.queryByText('Email address')).toBeNull();
  });

  it('renders the error message when provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeTruthy();
  });

  it('does not render an error when omitted', () => {
    render(<Input />);
    expect(screen.queryByText('This field is required')).toBeNull();
  });

  it('error text colour is Colors.sos', () => {
    render(<Input error="Oops" />);
    expect(screen.getByText('Oops')).toHaveStyle({ color: Colors.sos });
  });

  it('label text colour is Colors.textSecondary', () => {
    render(<Input label="Name" />);
    expect(screen.getByText('Name')).toHaveStyle({ color: Colors.textSecondary });
  });
});

// ─── Spec styles ─────────────────────────────────────────────────────────────

describe('Input — DESIGN-SPEC §6.3 style values', () => {
  it('container height is Spacing.inputHeight (52 px)', () => {
    render(<Input containerTestID="c" />);
    expect(screen.getByTestId('c')).toHaveStyle({ height: Spacing.inputHeight });
  });

  it('container background is Colors.surface', () => {
    render(<Input containerTestID="c" />);
    expect(screen.getByTestId('c')).toHaveStyle({
      backgroundColor: Colors.surface,
    });
  });

  it('border width is 1.5 px', () => {
    render(<Input containerTestID="c" />);
    expect(screen.getByTestId('c')).toHaveStyle({ borderWidth: 1.5 });
  });

  it('border radius is BorderRadius.medium (12 px)', () => {
    render(<Input containerTestID="c" />);
    expect(screen.getByTestId('c')).toHaveStyle({
      borderRadius: BorderRadius.medium,
    });
  });

  it('unfocused border colour is Colors.border', () => {
    render(<Input containerTestID="c" />);
    expect(screen.getByTestId('c')).toHaveStyle({ borderColor: Colors.border });
  });
});

// ─── Focus / blur state ───────────────────────────────────────────────────────

describe('Input — focus state', () => {
  it('border colour changes to Colors.primary on focus', () => {
    render(<Input containerTestID="c" placeholder="Type here" />);
    fireEvent(screen.getByPlaceholderText('Type here'), 'focus');
    expect(screen.getByTestId('c')).toHaveStyle({ borderColor: Colors.primary });
  });

  it('border colour returns to Colors.border on blur', () => {
    render(<Input containerTestID="c" placeholder="Type here" />);
    fireEvent(screen.getByPlaceholderText('Type here'), 'focus');
    fireEvent(screen.getByPlaceholderText('Type here'), 'blur');
    expect(screen.getByTestId('c')).toHaveStyle({ borderColor: Colors.border });
  });

  it('forwards the external onFocus callback', () => {
    const onFocus = jest.fn();
    render(<Input placeholder="x" onFocus={onFocus} />);
    fireEvent(screen.getByPlaceholderText('x'), 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('forwards the external onBlur callback', () => {
    const onBlur = jest.fn();
    render(<Input placeholder="x" onBlur={onBlur} />);
    fireEvent(screen.getByPlaceholderText('x'), 'focus');
    fireEvent(screen.getByPlaceholderText('x'), 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ─── TextInput prop passthrough ───────────────────────────────────────────────

describe('Input — TextInput prop passthrough', () => {
  it('forwards placeholder', () => {
    render(<Input placeholder="Enter destination" />);
    expect(screen.getByPlaceholderText('Enter destination')).toBeTruthy();
  });

  it('forwards value', () => {
    render(<Input value="Dublin" />);
    expect(screen.getByDisplayValue('Dublin')).toBeTruthy();
  });

  it('calls onChangeText when the value changes', () => {
    const onChangeText = jest.fn();
    render(<Input placeholder="x" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('x'), 'Galway');
    expect(onChangeText).toHaveBeenCalledWith('Galway');
  });

  it('forwards testID to the TextInput element', () => {
    render(<Input testID="my-input" />);
    expect(screen.getByTestId('my-input')).toBeTruthy();
  });
});
