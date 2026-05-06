/**
 * __tests__/unit/Avatar.test.tsx
 *
 * Tests for components/Avatar.tsx (DESIGN-SPEC §6.9).
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Avatar } from '../../components/Avatar';
import { Colors, FontFamily, Shadows } from '../../constants/theme';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Avatar — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<Avatar initials="JM" />)).not.toThrow();
  });

  it('renders the initials', () => {
    render(<Avatar initials="JM" />);
    expect(screen.getByText('JM')).toBeTruthy();
  });
});

// ─── Initials logic ───────────────────────────────────────────────────────────

describe('Avatar — initials handling', () => {
  it('uppercases lowercase initials', () => {
    render(<Avatar initials="jm" />);
    expect(screen.getByText('JM')).toBeTruthy();
  });

  it('truncates to 2 characters', () => {
    render(<Avatar initials="ABC" />);
    expect(screen.getByText('AB')).toBeTruthy();
    expect(screen.queryByText('ABC')).toBeNull();
  });

  it('renders a single initial correctly', () => {
    render(<Avatar initials="J" />);
    expect(screen.getByText('J')).toBeTruthy();
  });
});

// ─── Spec styles ─────────────────────────────────────────────────────────────

describe('Avatar — DESIGN-SPEC §6.9 style values', () => {
  it('default size is 40 × 40 px', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({ width: 40, height: 40 });
  });

  it('is a circle (borderRadius = size / 2) for default size', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({ borderRadius: 20 });
  });

  it('border width is 2 px', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({ borderWidth: 2 });
  });

  it('border colour is Colors.surface (white)', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({ borderColor: Colors.surface });
  });

  it('shadow elevation matches Shadows.card', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({
      elevation: Shadows.card.elevation,
    });
  });

  it('initials font size is 14 px', () => {
    render(<Avatar initials="JM" />);
    expect(screen.getByText('JM')).toHaveStyle({ fontSize: 14 });
  });

  it('initials fontFamily is FontFamily.semiBold (Poppins 600)', () => {
    render(<Avatar initials="JM" />);
    expect(screen.getByText('JM')).toHaveStyle({
      fontFamily: FontFamily.semiBold,
    });
  });

  it('initials colour is Colors.surface (white)', () => {
    render(<Avatar initials="JM" />);
    expect(screen.getByText('JM')).toHaveStyle({ color: Colors.surface });
  });
});

// ─── Colour prop ──────────────────────────────────────────────────────────────

describe('Avatar — color prop', () => {
  it('defaults to Colors.primary background', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({
      backgroundColor: Colors.primary,
    });
  });

  it('color="primary" uses Colors.primary background', () => {
    render(<Avatar initials="JM" color="primary" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({
      backgroundColor: Colors.primary,
    });
  });

  it('color="lavender" uses Colors.lavender background', () => {
    render(<Avatar initials="SR" color="lavender" testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({
      backgroundColor: Colors.lavender,
    });
  });
});

// ─── Custom size ──────────────────────────────────────────────────────────────

describe('Avatar — custom size', () => {
  it('applies a custom size', () => {
    render(<Avatar initials="JM" size={56} testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({ width: 56, height: 56 });
  });

  it('borderRadius is half the custom size (circle)', () => {
    render(<Avatar initials="JM" size={56} testID="av" />);
    expect(screen.getByTestId('av')).toHaveStyle({ borderRadius: 28 });
  });
});

// ─── Image vs initials ────────────────────────────────────────────────────────

describe('Avatar — imageUri', () => {
  it('shows initials when no imageUri is provided', () => {
    render(<Avatar initials="JM" testID="av" />);
    expect(screen.getByText('JM')).toBeTruthy();
  });

  it('does NOT show initials text when imageUri is provided', () => {
    render(
      <Avatar initials="JM" imageUri="https://example.com/photo.jpg" testID="av" />
    );
    expect(screen.queryByText('JM')).toBeNull();
  });

  it('renders the image element when imageUri is provided', () => {
    render(
      <Avatar
        initials="JM"
        imageUri="https://example.com/photo.jpg"
        testID="av"
      />
    );
    expect(screen.getByTestId('av-image')).toBeTruthy();
  });

  it('renders without crashing when imageUri provided but no testID', () => {
    // Exercises the `testID != null ? ... : undefined` false branch (line 88).
    expect(() =>
      render(<Avatar initials="JM" imageUri="https://example.com/photo.jpg" />)
    ).not.toThrow();
  });
});

// ─── Style override ───────────────────────────────────────────────────────────

describe('Avatar — style override', () => {
  it('accepts a style override', () => {
    render(<Avatar initials="JM" testID="av" style={{ opacity: 0.5 }} />);
    expect(screen.getByTestId('av')).toHaveStyle({ opacity: 0.5 });
  });
});
