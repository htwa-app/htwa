/**
 * __tests__/unit/Button.test.tsx
 *
 * Tests for components/Button.tsx (DESIGN-SPEC §6.1 and §6.2).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../../components/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Button — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<Button title="Go" />)).not.toThrow();
  });

  it('renders the title text', () => {
    render(<Button title="Search rides" />);
    expect(screen.getByText('Search rides')).toBeTruthy();
  });
});

// ─── Default / primary variant ────────────────────────────────────────────────

describe('Button — primary variant (default)', () => {
  it('defaults to the primary variant', () => {
    render(<Button title="Primary" testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({
      backgroundColor: Colors.primary,
    });
  });

  it('has the spec height (52 px)', () => {
    render(<Button title="H" testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({ height: Spacing.buttonHeight });
  });

  it('has full pill border radius (999)', () => {
    render(<Button title="R" testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({ borderRadius: BorderRadius.full });
  });

  it('label colour is Colors.surface (white)', () => {
    render(<Button title="Label" />);
    expect(screen.getByText('Label')).toHaveStyle({ color: Colors.surface });
  });
});

// ─── Secondary variant ────────────────────────────────────────────────────────

describe('Button — secondary variant', () => {
  it('background is Colors.primaryLight', () => {
    render(<Button variant="secondary" title="Cancel" testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({
      backgroundColor: Colors.primaryLight,
    });
  });

  it('has 1.5 px border in Colors.primary', () => {
    render(<Button variant="secondary" title="Cancel" testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({
      borderWidth: 1.5,
      borderColor: Colors.primary,
    });
  });

  it('label colour is Colors.primary', () => {
    render(<Button variant="secondary" title="Cancel" />);
    expect(screen.getByText('Cancel')).toHaveStyle({ color: Colors.primary });
  });
});

// ─── Disabled state ───────────────────────────────────────────────────────────

describe('Button — disabled state', () => {
  it('disabled primary renders without crashing', () => {
    expect(() =>
      render(<Button title="Off" disabled />)
    ).not.toThrow();
  });

  it('background becomes the disabled grey (#C8C8C8)', () => {
    render(<Button title="Off" disabled testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({
      backgroundColor: '#C8C8C8',
    });
  });

  it('disabled label colour is Colors.surface (white)', () => {
    render(<Button title="Off" disabled />);
    expect(screen.getByText('Off')).toHaveStyle({ color: Colors.surface });
  });

  it('disabled secondary removes border', () => {
    render(<Button variant="secondary" title="Off" disabled testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({ borderWidth: 0 });
  });

  it('does NOT call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Off" disabled onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('accessibilityState.disabled is true', () => {
    render(<Button title="Off" disabled testID="btn" />);
    expect(screen.getByTestId('btn').props.accessibilityState.disabled).toBe(true);
  });
});

// ─── Interaction ──────────────────────────────────────────────────────────────

describe('Button — interaction', () => {
  it('calls onPress when pressed and not disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Go" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('accessibilityRole is button', () => {
    render(<Button title="Go" testID="btn" />);
    expect(screen.getByTestId('btn').props.accessibilityRole).toBe('button');
  });

  it('accessibilityState.disabled is false by default', () => {
    render(<Button title="Go" testID="btn" />);
    expect(screen.getByTestId('btn').props.accessibilityState.disabled).toBe(false);
  });
});

// ─── Style override ───────────────────────────────────────────────────────────

describe('Button — style override', () => {
  it('accepts a style override on the container', () => {
    render(<Button title="Styled" style={{ opacity: 0.5 }} testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({ opacity: 0.5 });
  });

  it('accepts a textStyle override on the label', () => {
    render(<Button title="Styled" textStyle={{ letterSpacing: 2 }} />);
    expect(screen.getByText('Styled')).toHaveStyle({ letterSpacing: 2 });
  });
});
