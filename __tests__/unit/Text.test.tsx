/**
 * __tests__/unit/Text.test.tsx
 *
 * Tests for components/Text.tsx.
 *
 * Covers:
 *   - All 12 typographic variants render with correct fontSize / fontFamily /
 *     lineHeight from constants/theme.ts
 *   - Default variant (bodyMedium) when no variant prop is given
 *   - Style override: caller's style prop merges after the variant style
 *   - Standard RN Text props pass through (numberOfLines, testID,
 *     accessibilityRole, accessibilityLabel)
 *   - Children render correctly
 *   - Fonts-not-loaded fallback: fontFamily is stripped until fonts are ready
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, TextVariant } from '../../components/Text';
import { Typography, FontFamily } from '../../constants/theme';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Stub font assets — value is irrelevant; Expo Font caches them by name.
jest.mock('@expo-google-fonts/poppins', () => ({
  Poppins_400Regular:  undefined,
  Poppins_500Medium:   undefined,
  Poppins_600SemiBold: undefined,
  Poppins_700Bold:     undefined,
}));

/**
 * Mutable mock for useFonts.
 * Named with the `mock` prefix so Jest's babel transform can hoist the
 * jest.mock factory that closes over it without a TDZ error.
 */
const mockUseFonts = jest.fn<[boolean, Error | null], []>(() => [true, null]);

jest.mock('expo-font', () => ({
  useFonts: () => mockUseFonts(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All 12 variants from the spec with their expected theme values. */
const VARIANTS: Array<{
  variant: TextVariant;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
}> = [
  { variant: 'displayLarge',  fontSize: 32, fontFamily: FontFamily.bold,     lineHeight: 35 },
  { variant: 'displayMedium', fontSize: 24, fontFamily: FontFamily.semiBold, lineHeight: 29 },
  { variant: 'headingLarge',  fontSize: 20, fontFamily: FontFamily.semiBold, lineHeight: 26 },
  { variant: 'headingMedium', fontSize: 17, fontFamily: FontFamily.semiBold, lineHeight: 22 },
  { variant: 'headingSmall',  fontSize: 15, fontFamily: FontFamily.semiBold, lineHeight: 21 },
  { variant: 'bodyLarge',     fontSize: 16, fontFamily: FontFamily.regular,  lineHeight: 24 },
  { variant: 'bodyMedium',    fontSize: 14, fontFamily: FontFamily.regular,  lineHeight: 21 },
  { variant: 'bodySmall',     fontSize: 12, fontFamily: FontFamily.regular,  lineHeight: 18 },
  { variant: 'label',         fontSize: 12, fontFamily: FontFamily.medium,   lineHeight: 17 },
  { variant: 'micro',         fontSize: 10, fontFamily: FontFamily.regular,  lineHeight: 14 },
  { variant: 'button',        fontSize: 16, fontFamily: FontFamily.semiBold, lineHeight: 16 },
  { variant: 'buttonSmall',   fontSize: 14, fontFamily: FontFamily.semiBold, lineHeight: 14 },
];

beforeEach(() => {
  // Ensure every suite starts with fonts loaded unless overridden below.
  mockUseFonts.mockReturnValue([true, null]);
});

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('Text — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<Text>hello</Text>)).not.toThrow();
  });

  it('renders its children', () => {
    render(<Text>design system text</Text>);
    expect(screen.getByText('design system text')).toBeTruthy();
  });
});

// ─── Default variant ──────────────────────────────────────────────────────────

describe('Text — default variant', () => {
  it('defaults to bodyMedium when no variant is given', () => {
    render(<Text testID="t">default</Text>);
    expect(screen.getByTestId('t')).toHaveStyle({
      fontSize:   Typography.bodyMedium.fontSize,
      fontFamily: Typography.bodyMedium.fontFamily,
      lineHeight: Typography.bodyMedium.lineHeight,
    });
  });
});

// ─── All 12 variants ──────────────────────────────────────────────────────────

describe('Text — every DESIGN-SPEC §2 variant', () => {
  VARIANTS.forEach(({ variant, fontSize, fontFamily, lineHeight }) => {
    describe(variant, () => {
      it(`renders without crashing`, () => {
        render(<Text variant={variant} testID={variant}>{variant} text</Text>);
        expect(screen.getByTestId(variant)).toBeTruthy();
      });

      it(`fontSize is ${fontSize}`, () => {
        render(<Text variant={variant} testID={`${variant}-sz`}>x</Text>);
        expect(screen.getByTestId(`${variant}-sz`)).toHaveStyle({ fontSize });
      });

      it(`fontFamily is ${fontFamily}`, () => {
        render(<Text variant={variant} testID={`${variant}-ff`}>x</Text>);
        expect(screen.getByTestId(`${variant}-ff`)).toHaveStyle({ fontFamily });
      });

      it(`lineHeight is ${lineHeight}`, () => {
        render(<Text variant={variant} testID={`${variant}-lh`}>x</Text>);
        expect(screen.getByTestId(`${variant}-lh`)).toHaveStyle({ lineHeight });
      });
    });
  });
});

// ─── Style override ───────────────────────────────────────────────────────────

describe('Text — style override', () => {
  it('merges caller style after the variant style', () => {
    render(
      <Text variant="bodyLarge" style={{ color: '#FF0000', marginTop: 8 }} testID="ov">
        styled
      </Text>
    );
    const el = screen.getByTestId('ov');
    expect(el).toHaveStyle({ fontSize: Typography.bodyLarge.fontSize });
    expect(el).toHaveStyle({ color: '#FF0000', marginTop: 8 });
  });

  it('caller style can override fontSize from the variant', () => {
    render(<Text variant="micro" style={{ fontSize: 99 }} testID="fs-ov">big</Text>);
    expect(screen.getByTestId('fs-ov')).toHaveStyle({ fontSize: 99 });
  });
});

// ─── Passthrough props ────────────────────────────────────────────────────────

describe('Text — React Native Text prop passthrough', () => {
  it('forwards testID', () => {
    render(<Text testID="fwd">content</Text>);
    expect(screen.getByTestId('fwd')).toBeTruthy();
  });

  it('forwards numberOfLines', () => {
    render(<Text numberOfLines={2} testID="nl">long</Text>);
    expect(screen.getByTestId('nl').props.numberOfLines).toBe(2);
  });

  it('forwards accessibilityRole', () => {
    render(<Text accessibilityRole="header" testID="ar">heading</Text>);
    expect(screen.getByTestId('ar').props.accessibilityRole).toBe('header');
  });

  it('forwards accessibilityLabel', () => {
    render(<Text accessibilityLabel="my label" testID="al">text</Text>);
    expect(screen.getByTestId('al').props.accessibilityLabel).toBe('my label');
  });
});

// ─── Fonts-not-loaded fallback ────────────────────────────────────────────────

describe('Text — fonts-not-loaded fallback', () => {
  beforeEach(() => {
    mockUseFonts.mockReturnValue([false, null]);
  });

  it('renders without crashing when fonts are not yet loaded', () => {
    expect(() =>
      render(<Text testID="fallback">loading</Text>)
    ).not.toThrow();
  });

  it('still renders children when fonts are not yet loaded', () => {
    render(<Text testID="fallback-children">loading text</Text>);
    expect(screen.getByText('loading text')).toBeTruthy();
  });

  it('preserves fontSize when fonts are not yet loaded', () => {
    render(<Text variant="headingLarge" testID="fallback-sz">text</Text>);
    expect(screen.getByTestId('fallback-sz')).toHaveStyle({
      fontSize: Typography.headingLarge.fontSize,
    });
  });

  it('preserves lineHeight when fonts are not yet loaded', () => {
    render(<Text variant="headingLarge" testID="fallback-lh">text</Text>);
    expect(screen.getByTestId('fallback-lh')).toHaveStyle({
      lineHeight: Typography.headingLarge.lineHeight,
    });
  });

  it('strips fontFamily when fonts are not yet loaded', () => {
    render(<Text variant="headingLarge" testID="fallback-ff">text</Text>);
    expect(screen.getByTestId('fallback-ff')).not.toHaveStyle({
      fontFamily: FontFamily.semiBold,
    });
  });
});
