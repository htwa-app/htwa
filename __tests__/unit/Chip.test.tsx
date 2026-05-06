/**
 * __tests__/unit/Chip.test.tsx
 *
 * Tests for components/Chip.tsx (DESIGN-SPEC §6.6).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Chip } from '../../components/Chip';
import { Colors, BorderRadius, FontFamily } from '../../constants/theme';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Chip — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<Chip label="Today" />)).not.toThrow();
  });

  it('renders the label text', () => {
    render(<Chip label="Any time" />);
    expect(screen.getByText('Any time')).toBeTruthy();
  });
});

// ─── Spec styles ─────────────────────────────────────────────────────────────

describe('Chip — DESIGN-SPEC §6.6 style values', () => {
  it('background is Colors.primaryLight (#E8F4F4)', () => {
    render(<Chip label="x" testID="chip" />);
    expect(screen.getByTestId('chip')).toHaveStyle({
      backgroundColor: Colors.primaryLight,
    });
  });

  it('border radius is BorderRadius.full (999 px)', () => {
    render(<Chip label="x" testID="chip" />);
    expect(screen.getByTestId('chip')).toHaveStyle({
      borderRadius: BorderRadius.full,
    });
  });

  it('height is 28 px', () => {
    render(<Chip label="x" testID="chip" />);
    expect(screen.getByTestId('chip')).toHaveStyle({ height: 28 });
  });

  it('label colour is Colors.primary (#1F7A78)', () => {
    render(<Chip label="Today" />);
    expect(screen.getByText('Today')).toHaveStyle({ color: Colors.primary });
  });

  it('label font size is 12 px', () => {
    render(<Chip label="Today" />);
    expect(screen.getByText('Today')).toHaveStyle({ fontSize: 12 });
  });

  it('label fontFamily is FontFamily.medium (Poppins 500)', () => {
    render(<Chip label="Today" />);
    expect(screen.getByText('Today')).toHaveStyle({
      fontFamily: FontFamily.medium,
    });
  });
});

// ─── Interactive vs display-only ─────────────────────────────────────────────

describe('Chip — interactive (onPress provided)', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Chip label="Filter" onPress={onPress} testID="chip" />);
    fireEvent.press(screen.getByTestId('chip'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole="button" when onPress is provided', () => {
    render(<Chip label="Filter" onPress={() => {}} testID="chip" />);
    expect(screen.getByTestId('chip').props.accessibilityRole).toBe('button');
  });
});

describe('Chip — display-only (no onPress)', () => {
  it('renders without crashing when no onPress is provided', () => {
    expect(() => render(<Chip label="Read only" />)).not.toThrow();
  });

  it('does NOT have accessibilityRole="button" when no onPress', () => {
    render(<Chip label="Read only" testID="chip" />);
    expect(screen.getByTestId('chip').props.accessibilityRole).toBeUndefined();
  });
});

// ─── Style override ───────────────────────────────────────────────────────────

describe('Chip — style override', () => {
  it('accepts a style override', () => {
    render(<Chip label="x" testID="chip" style={{ opacity: 0.5 }} />);
    expect(screen.getByTestId('chip')).toHaveStyle({ opacity: 0.5 });
  });
});
