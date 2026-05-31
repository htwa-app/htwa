/**
 * __tests__/unit/Badge.test.tsx
 *
 * Tests for components/Badge.tsx (DESIGN-SPEC §6.5 and §6.7).
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Badge } from '../../components/Badge';
import { Colors, BorderRadius, FontFamily } from '../../constants/theme';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Badge — smoke', () => {
  it('verified renders without crashing', () => {
    expect(() => render(<Badge variant="verified" />)).not.toThrow();
  });

  it('womenOnly renders without crashing', () => {
    expect(() => render(<Badge variant="womenOnly" />)).not.toThrow();
  });
});

// ─── Verified badge (§6.5) ────────────────────────────────────────────────────

describe('Badge — verified variant (§6.5)', () => {
  it('displays the "Verified" label', () => {
    render(<Badge variant="verified" />);
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('displays the tick character', () => {
    render(<Badge variant="verified" />);
    // The decorative tick is aria-hidden (hidden from screen readers per a11y
    // best practice), so include hidden elements when querying for it.
    expect(screen.getByText('✓', { includeHiddenElements: true })).toBeTruthy();
  });

  it('container background is Colors.verified (#34C759)', () => {
    render(<Badge variant="verified" testID="badge" />);
    expect(screen.getByTestId('badge')).toHaveStyle({
      backgroundColor: Colors.verified,
    });
  });

  it('container border radius is BorderRadius.full (pill shape)', () => {
    render(<Badge variant="verified" testID="badge" />);
    expect(screen.getByTestId('badge')).toHaveStyle({
      borderRadius: BorderRadius.full,
    });
  });

  it('verified label is white (Colors.surface)', () => {
    render(<Badge variant="verified" />);
    expect(screen.getByText('Verified')).toHaveStyle({ color: Colors.surface });
  });

  it('verified label font size is 11 px', () => {
    render(<Badge variant="verified" />);
    expect(screen.getByText('Verified')).toHaveStyle({ fontSize: 11 });
  });

  it('verified label fontFamily is FontFamily.medium (Poppins 500)', () => {
    render(<Badge variant="verified" />);
    expect(screen.getByText('Verified')).toHaveStyle({
      fontFamily: FontFamily.medium,
    });
  });
});

// ─── Women-only badge (§6.7) ──────────────────────────────────────────────────

describe('Badge — womenOnly variant (§6.7)', () => {
  it('displays the "Women only" label', () => {
    render(<Badge variant="womenOnly" />);
    expect(screen.getByText('Women only')).toBeTruthy();
  });

  it('container background is Colors.lavender (#C8B8E8)', () => {
    render(<Badge variant="womenOnly" testID="badge" />);
    expect(screen.getByTestId('badge')).toHaveStyle({
      backgroundColor: Colors.lavender,
    });
  });

  it('container border radius is BorderRadius.full (pill shape)', () => {
    render(<Badge variant="womenOnly" testID="badge" />);
    expect(screen.getByTestId('badge')).toHaveStyle({
      borderRadius: BorderRadius.full,
    });
  });

  it('women-only label font size is 12 px', () => {
    render(<Badge variant="womenOnly" />);
    expect(screen.getByText('Women only')).toHaveStyle({ fontSize: 12 });
  });

  it('women-only label fontFamily is FontFamily.medium (Poppins 500)', () => {
    render(<Badge variant="womenOnly" />);
    expect(screen.getByText('Women only')).toHaveStyle({
      fontFamily: FontFamily.medium,
    });
  });

  it('women-only label colour is the spec deep purple (#2A1F4A)', () => {
    render(<Badge variant="womenOnly" />);
    expect(screen.getByText('Women only')).toHaveStyle({ color: '#2A1F4A' });
  });
});

// ─── Variant isolation ────────────────────────────────────────────────────────

describe('Badge — variant isolation', () => {
  it('verified badge does NOT show "Women only" text', () => {
    render(<Badge variant="verified" />);
    expect(screen.queryByText('Women only')).toBeNull();
  });

  it('womenOnly badge does NOT show "Verified" text', () => {
    render(<Badge variant="womenOnly" />);
    expect(screen.queryByText('Verified')).toBeNull();
  });

  it('womenOnly badge does NOT show the tick character', () => {
    render(<Badge variant="womenOnly" />);
    expect(screen.queryByText('✓')).toBeNull();
  });
});

// ─── Style override ───────────────────────────────────────────────────────────

describe('Badge — style override', () => {
  it('accepts a style override on the container', () => {
    render(<Badge variant="verified" testID="badge" style={{ marginRight: 8 }} />);
    expect(screen.getByTestId('badge')).toHaveStyle({ marginRight: 8 });
  });
});
