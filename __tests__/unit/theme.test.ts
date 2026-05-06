/**
 * Design-token contract tests — __tests__/unit/theme.test.ts
 *
 * Every exported token is tested against its exact value from DESIGN-SPEC.md.
 * If a value drifts in theme.ts these tests will fail, keeping the code honest.
 *
 * Spec sections covered:
 *   §1  Brand Colours  → Colors
 *   §2  Typography     → FontFamily · FontWeights · Typography
 *   §3  Spacing        → Spacing
 *   §4  Border Radius  → BorderRadius · Radius (alias)
 *   §5  Shadows        → Shadows · ShadowCard · ShadowElevated (aliases)
 */

import {
  Colors,
  FontFamily,
  FontWeights,
  Typography,
  Spacing,
  BorderRadius,
  Radius,
  Shadows,
  ShadowCard,
  ShadowElevated,
} from '../../constants/theme';

// ─── §1  Colors ───────────────────────────────────────────────────────────────

describe('Colors — §1 Brand Colours', () => {
  it('primary is #1F7A78', () => expect(Colors.primary).toBe('#1F7A78'));
  it('primaryLight is #E8F4F4', () => expect(Colors.primaryLight).toBe('#E8F4F4'));
  it('lavender is #C8B8E8', () => expect(Colors.lavender).toBe('#C8B8E8'));
  it('lavenderLight is #F0EBF8', () => expect(Colors.lavenderLight).toBe('#F0EBF8'));
  it('amber is #E8A55A', () => expect(Colors.amber).toBe('#E8A55A'));
  it('amberLight is #FDF3E7', () => expect(Colors.amberLight).toBe('#FDF3E7'));
  it('background is #F7F3ED', () => expect(Colors.background).toBe('#F7F3ED'));
  it('surface is #FFFFFF', () => expect(Colors.surface).toBe('#FFFFFF'));
  it('textPrimary is #2A251F', () => expect(Colors.textPrimary).toBe('#2A251F'));
  it('textSecondary is rgba(40,30,20,0.55)', () =>
    expect(Colors.textSecondary).toBe('rgba(40,30,20,0.55)'));
  it('textTertiary is rgba(40,30,20,0.35)', () =>
    expect(Colors.textTertiary).toBe('rgba(40,30,20,0.35)'));
  it('border is rgba(40,30,20,0.10)', () =>
    expect(Colors.border).toBe('rgba(40,30,20,0.10)'));
  it('verified is #34C759', () => expect(Colors.verified).toBe('#34C759'));
  it('sos is #FF3B30', () => expect(Colors.sos).toBe('#FF3B30'));
  it('sosLight is #FFF0EF', () => expect(Colors.sosLight).toBe('#FFF0EF'));
  it('shadow is rgba(0,0,0,0.07)', () =>
    expect(Colors.shadow).toBe('rgba(0,0,0,0.07)'));

  it('exports exactly the 16 spec tokens (no extras, no dark sub-object)', () => {
    const keys = Object.keys(Colors);
    expect(keys).toHaveLength(16);
    expect(keys).not.toContain('dark');
  });
});

// ─── §2  FontFamily ───────────────────────────────────────────────────────────

describe('FontFamily — §2 Typography', () => {
  it('regular is Poppins_400Regular', () =>
    expect(FontFamily.regular).toBe('Poppins_400Regular'));
  it('medium is Poppins_500Medium', () =>
    expect(FontFamily.medium).toBe('Poppins_500Medium'));
  it('semiBold is Poppins_600SemiBold', () =>
    expect(FontFamily.semiBold).toBe('Poppins_600SemiBold'));
  it('bold is Poppins_700Bold', () =>
    expect(FontFamily.bold).toBe('Poppins_700Bold'));
});

// ─── §2  FontWeights ──────────────────────────────────────────────────────────

describe('FontWeights — §2 Typography', () => {
  it('regular is 400', () => expect(FontWeights.regular).toBe(400));
  it('medium is 500', () => expect(FontWeights.medium).toBe(500));
  it('semiBold is 600', () => expect(FontWeights.semiBold).toBe(600));
  it('bold is 700', () => expect(FontWeights.bold).toBe(700));
});

// ─── §2  Typography ───────────────────────────────────────────────────────────

describe('Typography — §2 Typography (font size · family · line height)', () => {
  // displayLarge  32 / 700 / ×1.1 → lh 35
  describe('displayLarge', () => {
    it('fontSize 32', () => expect(Typography.displayLarge.fontSize).toBe(32));
    it('fontFamily bold', () =>
      expect(Typography.displayLarge.fontFamily).toBe(FontFamily.bold));
    it('lineHeight 35 (32 × 1.1)', () =>
      expect(Typography.displayLarge.lineHeight).toBe(35));
  });

  // displayMedium  24 / 600 / ×1.2 → lh 29
  describe('displayMedium', () => {
    it('fontSize 24', () => expect(Typography.displayMedium.fontSize).toBe(24));
    it('fontFamily semiBold', () =>
      expect(Typography.displayMedium.fontFamily).toBe(FontFamily.semiBold));
    it('lineHeight 29 (24 × 1.2)', () =>
      expect(Typography.displayMedium.lineHeight).toBe(29));
  });

  // headingLarge  20 / 600 / ×1.3 → lh 26
  describe('headingLarge', () => {
    it('fontSize 20', () => expect(Typography.headingLarge.fontSize).toBe(20));
    it('fontFamily semiBold', () =>
      expect(Typography.headingLarge.fontFamily).toBe(FontFamily.semiBold));
    it('lineHeight 26 (20 × 1.3)', () =>
      expect(Typography.headingLarge.lineHeight).toBe(26));
  });

  // headingMedium  17 / 600 / ×1.3 → lh 22
  describe('headingMedium', () => {
    it('fontSize 17', () => expect(Typography.headingMedium.fontSize).toBe(17));
    it('fontFamily semiBold', () =>
      expect(Typography.headingMedium.fontFamily).toBe(FontFamily.semiBold));
    it('lineHeight 22 (17 × 1.3)', () =>
      expect(Typography.headingMedium.lineHeight).toBe(22));
  });

  // headingSmall  15 / 600 / ×1.4 → lh 21
  describe('headingSmall', () => {
    it('fontSize 15', () => expect(Typography.headingSmall.fontSize).toBe(15));
    it('fontFamily semiBold', () =>
      expect(Typography.headingSmall.fontFamily).toBe(FontFamily.semiBold));
    it('lineHeight 21 (15 × 1.4)', () =>
      expect(Typography.headingSmall.lineHeight).toBe(21));
  });

  // bodyLarge  16 / 400 / ×1.5 → lh 24
  describe('bodyLarge', () => {
    it('fontSize 16', () => expect(Typography.bodyLarge.fontSize).toBe(16));
    it('fontFamily regular', () =>
      expect(Typography.bodyLarge.fontFamily).toBe(FontFamily.regular));
    it('lineHeight 24 (16 × 1.5)', () =>
      expect(Typography.bodyLarge.lineHeight).toBe(24));
  });

  // bodyMedium  14 / 400 / ×1.5 → lh 21
  describe('bodyMedium', () => {
    it('fontSize 14', () => expect(Typography.bodyMedium.fontSize).toBe(14));
    it('fontFamily regular', () =>
      expect(Typography.bodyMedium.fontFamily).toBe(FontFamily.regular));
    it('lineHeight 21 (14 × 1.5)', () =>
      expect(Typography.bodyMedium.lineHeight).toBe(21));
  });

  // bodySmall  12 / 400 / ×1.5 → lh 18
  describe('bodySmall', () => {
    it('fontSize 12', () => expect(Typography.bodySmall.fontSize).toBe(12));
    it('fontFamily regular', () =>
      expect(Typography.bodySmall.fontFamily).toBe(FontFamily.regular));
    it('lineHeight 18 (12 × 1.5)', () =>
      expect(Typography.bodySmall.lineHeight).toBe(18));
  });

  // label  12 / 500 / ×1.4 → lh 17
  describe('label', () => {
    it('fontSize 12', () => expect(Typography.label.fontSize).toBe(12));
    it('fontFamily medium', () =>
      expect(Typography.label.fontFamily).toBe(FontFamily.medium));
    it('lineHeight 17 (12 × 1.4)', () =>
      expect(Typography.label.lineHeight).toBe(17));
  });

  // micro  10 / 400 / ×1.4 → lh 14
  describe('micro', () => {
    it('fontSize 10', () => expect(Typography.micro.fontSize).toBe(10));
    it('fontFamily regular', () =>
      expect(Typography.micro.fontFamily).toBe(FontFamily.regular));
    it('lineHeight 14 (10 × 1.4)', () =>
      expect(Typography.micro.lineHeight).toBe(14));
  });

  // button  16 / 600 / ×1.0 → lh 16
  describe('button', () => {
    it('fontSize 16', () => expect(Typography.button.fontSize).toBe(16));
    it('fontFamily semiBold', () =>
      expect(Typography.button.fontFamily).toBe(FontFamily.semiBold));
    it('lineHeight 16 (16 × 1.0)', () =>
      expect(Typography.button.lineHeight).toBe(16));
  });

  // buttonSmall  14 / 600 / ×1.0 → lh 14
  describe('buttonSmall', () => {
    it('fontSize 14', () => expect(Typography.buttonSmall.fontSize).toBe(14));
    it('fontFamily semiBold', () =>
      expect(Typography.buttonSmall.fontFamily).toBe(FontFamily.semiBold));
    it('lineHeight 14 (14 × 1.0)', () =>
      expect(Typography.buttonSmall.lineHeight).toBe(14));
  });

  it('exports exactly 12 styles', () =>
    expect(Object.keys(Typography)).toHaveLength(12));
});

// ─── §3  Spacing ──────────────────────────────────────────────────────────────

describe('Spacing — §3 Spacing & Layout', () => {
  // Named layout tokens from spec table
  it('screenPadding is 20', () => expect(Spacing.screenPadding).toBe(20));
  it('cardPadding is 16', () => expect(Spacing.cardPadding).toBe(16));
  it('sectionGap is 24', () => expect(Spacing.sectionGap).toBe(24));
  it('itemGap is 12', () => expect(Spacing.itemGap).toBe(12));
  it('inputHeight is 52', () => expect(Spacing.inputHeight).toBe(52));
  it('buttonHeight is 52', () => expect(Spacing.buttonHeight).toBe(52));
  it('buttonHeightSmall is 40', () => expect(Spacing.buttonHeightSmall).toBe(40));
  it('tabBarHeight is 60', () => expect(Spacing.tabBarHeight).toBe(60));
  it('headerHeight is 56', () => expect(Spacing.headerHeight).toBe(56));

  // Base scale — 4px grid
  it('xs is 4', () => expect(Spacing.xs).toBe(4));
  it('sm is 8', () => expect(Spacing.sm).toBe(8));
  it('md is 12', () => expect(Spacing.md).toBe(12));
  it('lg is 16', () => expect(Spacing.lg).toBe(16));
  it('xl is 20', () => expect(Spacing.xl).toBe(20));
  it('xxl is 24', () => expect(Spacing.xxl).toBe(24));
  it('xxxl is 32', () => expect(Spacing.xxxl).toBe(32));
  it('xxxxl is 40', () => expect(Spacing.xxxxl).toBe(40));
  it('xxxxxl is 48', () => expect(Spacing.xxxxxl).toBe(48));
});

// ─── §4  BorderRadius ─────────────────────────────────────────────────────────

describe('BorderRadius — §4 Border Radius', () => {
  it('small is 8', () => expect(BorderRadius.small).toBe(8));
  it('medium is 12', () => expect(BorderRadius.medium).toBe(12));
  it('large is 16', () => expect(BorderRadius.large).toBe(16));
  it('xl is 24', () => expect(BorderRadius.xl).toBe(24));
  it('full is 999', () => expect(BorderRadius.full).toBe(999));
});

describe('Radius — backward-compatible alias for BorderRadius', () => {
  it('is the same object reference as BorderRadius', () =>
    expect(Radius).toBe(BorderRadius));
  it('small is 8', () => expect(Radius.small).toBe(8));
  it('medium is 12', () => expect(Radius.medium).toBe(12));
  it('large is 16', () => expect(Radius.large).toBe(16));
  it('xl is 24', () => expect(Radius.xl).toBe(24));
  it('full is 999', () => expect(Radius.full).toBe(999));
});

// ─── §5  Shadows ──────────────────────────────────────────────────────────────

describe('Shadows — §5 Shadows', () => {
  describe('Shadows.card (standard card shadow)', () => {
    it('shadowColor is #000', () =>
      expect(Shadows.card.shadowColor).toBe('#000'));
    it('shadowOffset width is 0', () =>
      expect(Shadows.card.shadowOffset.width).toBe(0));
    it('shadowOffset height is 2', () =>
      expect(Shadows.card.shadowOffset.height).toBe(2));
    it('shadowOpacity is 0.07', () =>
      expect(Shadows.card.shadowOpacity).toBe(0.07));
    it('shadowRadius is 8', () =>
      expect(Shadows.card.shadowRadius).toBe(8));
    it('elevation is 3', () =>
      expect(Shadows.card.elevation).toBe(3));
  });

  describe('Shadows.elevated (modal shadow)', () => {
    it('shadowColor is #000', () =>
      expect(Shadows.elevated.shadowColor).toBe('#000'));
    it('shadowOffset width is 0', () =>
      expect(Shadows.elevated.shadowOffset.width).toBe(0));
    it('shadowOffset height is 4', () =>
      expect(Shadows.elevated.shadowOffset.height).toBe(4));
    it('shadowOpacity is 0.10', () =>
      expect(Shadows.elevated.shadowOpacity).toBe(0.10));
    it('shadowRadius is 16', () =>
      expect(Shadows.elevated.shadowRadius).toBe(16));
    it('elevation is 8', () =>
      expect(Shadows.elevated.elevation).toBe(8));
  });
});

describe('ShadowCard — backward-compatible alias for Shadows.card', () => {
  it('is the same object reference as Shadows.card', () =>
    expect(ShadowCard).toBe(Shadows.card));
  it('shadowOpacity is 0.07', () =>
    expect(ShadowCard.shadowOpacity).toBe(0.07));
  it('elevation is 3', () =>
    expect(ShadowCard.elevation).toBe(3));
});

describe('ShadowElevated — backward-compatible alias for Shadows.elevated', () => {
  it('is the same object reference as Shadows.elevated', () =>
    expect(ShadowElevated).toBe(Shadows.elevated));
  it('shadowOpacity is 0.10', () =>
    expect(ShadowElevated.shadowOpacity).toBe(0.10));
  it('elevation is 8', () =>
    expect(ShadowElevated.elevation).toBe(8));
});
