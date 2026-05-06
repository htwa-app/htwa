/**
 * __tests__/unit/Card.test.tsx
 *
 * Tests for components/Card.tsx (DESIGN-SPEC §6.4).
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Card } from '../../components/Card';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Card — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<Card />)).not.toThrow();
  });

  it('renders children', () => {
    render(
      <Card>
        <Text>route info</Text>
      </Card>
    );
    expect(screen.getByText('route info')).toBeTruthy();
  });
});

// ─── Spec values ─────────────────────────────────────────────────────────────

describe('Card — DESIGN-SPEC §6.4 style values', () => {
  it('background is Colors.surface (#FFFFFF)', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: Colors.surface,
    });
  });

  it('border radius is BorderRadius.large (16 px)', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      borderRadius: BorderRadius.large,
    });
  });

  it('border width is 1 px', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({ borderWidth: 1 });
  });

  it('border colour is rgba(40,30,20,0.08)', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      borderColor: 'rgba(40,30,20,0.08)',
    });
  });

  it('padding is Spacing.cardPadding (16 px)', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      padding: Spacing.cardPadding,
    });
  });

  it('shadowColor is #000', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      shadowColor: Shadows.card.shadowColor,
    });
  });

  it('shadowOpacity matches Shadows.card (0.07)', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      shadowOpacity: Shadows.card.shadowOpacity,
    });
  });

  it('elevation matches Shadows.card (3)', () => {
    render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      elevation: Shadows.card.elevation,
    });
  });
});

// ─── Style override ───────────────────────────────────────────────────────────

describe('Card — style override', () => {
  it('accepts a style override', () => {
    render(<Card testID="card" style={{ marginTop: 24 }} />);
    expect(screen.getByTestId('card')).toHaveStyle({ marginTop: 24 });
  });

  it('preserves spec styles when a style override is applied', () => {
    render(<Card testID="card" style={{ marginTop: 8 }} />);
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.large,
    });
  });
});

// ─── Multiple children ────────────────────────────────────────────────────────

describe('Card — multiple children', () => {
  it('renders multiple children', () => {
    render(
      <Card>
        <Text>title</Text>
        <Text>subtitle</Text>
      </Card>
    );
    expect(screen.getByText('title')).toBeTruthy();
    expect(screen.getByText('subtitle')).toBeTruthy();
  });

  it('renders with no children', () => {
    expect(() => render(<Card testID="empty" />)).not.toThrow();
  });
});
