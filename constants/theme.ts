/**
 * HTWA Design Tokens — constants/theme.ts
 *
 * Single source of truth for every colour, typographic style, spacing value,
 * border radius, and shadow in the app.  Every value is derived directly from
 * DESIGN-SPEC.md.  No magic numbers anywhere else in the codebase.
 *
 * Spec sections:
 *   §1  Brand Colours  → Colors
 *   §2  Typography     → FontFamily · FontWeights · Typography
 *   §3  Spacing        → Spacing
 *   §4  Border Radius  → BorderRadius  (alias: Radius)
 *   §5  Shadows        → Shadows       (aliases: ShadowCard · ShadowElevated)
 */

// ─── §1  Brand Colours ────────────────────────────────────────────────────────

export const Colors = {
  /** #1F7A78 — buttons, links, active states, route chips, icons */
  primary: '#1F7A78',
  /** #E8F4F4 — secondary button backgrounds, teal-tint surfaces */
  primaryLight: '#E8F4F4',
  /** #C8B8E8 — women-only mode UI, accent surfaces, info boxes */
  lavender: '#C8B8E8',
  /** #F0EBF8 — lavender-tint backgrounds */
  lavenderLight: '#F0EBF8',
  /** #E8A55A — warm accent, savings callouts, highlights */
  amber: '#E8A55A',
  /** #FDF3E7 — amber-tint backgrounds */
  amberLight: '#FDF3E7',
  /** #F7F3ED — page/screen background; always off-white, never cold grey */
  background: '#F7F3ED',
  /** #FFFFFF — cards, modals, input fields */
  surface: '#FFFFFF',
  /** #2A251F — all primary body text and headings */
  textPrimary: '#2A251F',
  /** rgba(40,30,20,0.55) — subtitles, captions, placeholder text */
  textSecondary: 'rgba(40,30,20,0.55)',
  /** rgba(40,30,20,0.35) — disabled states, fine print */
  textTertiary: 'rgba(40,30,20,0.35)',
  /** rgba(40,30,20,0.10) — card borders, dividers, input borders */
  border: 'rgba(40,30,20,0.10)',
  /** #34C759 — verified tick/badge (iOS system green) */
  verified: '#34C759',
  /** #FF3B30 — silent SOS button only */
  sos: '#FF3B30',
  /** #FFF0EF — SOS / danger tint background */
  sosLight: '#FFF0EF',
  /** rgba(0,0,0,0.07) — soft card shadow colour */
  shadow: 'rgba(0,0,0,0.07)',
} as const;

// ─── §2  Typography ───────────────────────────────────────────────────────────

/** Poppins font family tokens — loaded in app/_layout.tsx via @expo-google-fonts/poppins */
export const FontFamily = {
  regular:  'Poppins_400Regular',
  medium:   'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold:     'Poppins_700Bold',
} as const;

/** Raw numeric font-weight values from §2 */
export const FontWeights = {
  regular:  400,
  medium:   500,
  semiBold: 600,
  bold:     700,
} as const;

/**
 * Complete text styles — spread directly onto React Native Text components.
 * Line heights are absolute pixels (spec multiplier × font size, rounded to nearest integer).
 *
 * Spec table (§2):
 *   displayLarge  32px 700 ×1.1 = 35
 *   displayMedium 24px 600 ×1.2 = 29
 *   headingLarge  20px 600 ×1.3 = 26
 *   headingMedium 17px 600 ×1.3 = 22
 *   headingSmall  15px 600 ×1.4 = 21
 *   bodyLarge     16px 400 ×1.5 = 24
 *   bodyMedium    14px 400 ×1.5 = 21
 *   bodySmall     12px 400 ×1.5 = 18
 *   label         12px 500 ×1.4 = 17
 *   micro         10px 400 ×1.4 = 14
 *   button        16px 600 ×1.0 = 16
 *   buttonSmall   14px 600 ×1.0 = 14
 */
export const Typography = {
  /** App name, hero headings — 32 / 700 / lh 35 */
  displayLarge: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    lineHeight: 35,
  },
  /** Screen titles — 24 / 600 / lh 29 */
  displayMedium: {
    fontSize: 24,
    fontFamily: FontFamily.semiBold,
    lineHeight: 29,
  },
  /** Section headings — 20 / 600 / lh 26 */
  headingLarge: {
    fontSize: 20,
    fontFamily: FontFamily.semiBold,
    lineHeight: 26,
  },
  /** Card titles, list headings — 17 / 600 / lh 22 */
  headingMedium: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    lineHeight: 22,
  },
  /** Sub-headings — 15 / 600 / lh 21 */
  headingSmall: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    lineHeight: 21,
  },
  /** Primary body text — 16 / 400 / lh 24 */
  bodyLarge: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    lineHeight: 24,
  },
  /** Secondary body text — 14 / 400 / lh 21 */
  bodyMedium: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    lineHeight: 21,
  },
  /** Captions, metadata — 12 / 400 / lh 18 */
  bodySmall: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    lineHeight: 18,
  },
  /** Chips, badges, tags — 12 / 500 / lh 17 */
  label: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    lineHeight: 17,
  },
  /** Legal text, fine print — 10 / 400 / lh 14 */
  micro: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    lineHeight: 14,
  },
  /** All button labels — 16 / 600 / lh 16 */
  button: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    lineHeight: 16,
  },
  /** Small button labels — 14 / 600 / lh 14 */
  buttonSmall: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    lineHeight: 14,
  },
} as const;

// ─── §3  Spacing & Layout ─────────────────────────────────────────────────────

export const Spacing = {
  /** 20px — horizontal padding on all screens */
  screenPadding: 20,
  /** 16px — internal padding on cards */
  cardPadding: 16,
  /** 24px — gap between major sections */
  sectionGap: 24,
  /** 12px — gap between list items */
  itemGap: 12,
  /** 52px — height of all text input fields */
  inputHeight: 52,
  /** 52px — height of primary buttons */
  buttonHeight: 52,
  /** 40px — height of secondary / small buttons */
  buttonHeightSmall: 40,
  /** 60px — bottom tab bar height */
  tabBarHeight: 60,
  /** 56px — navigation header height */
  headerHeight: 56,
  // ── Base scale (4px grid) ──────────────────────────────────────────────────
  xs:     4,
  sm:     8,
  md:     12,
  lg:     16,
  xl:     20,
  xxl:    24,
  xxxl:   32,
  xxxxl:  40,
  xxxxxl: 48,
} as const;

// ─── §4  Border Radius ────────────────────────────────────────────────────────

/**
 * BorderRadius — spec-canonical export name.
 * Rule: always use rounded corners; nothing sharp or angular.
 */
export const BorderRadius = {
  /** 8px — chips, badges, small tags */
  small:  8,
  /** 12px — input fields, small cards */
  medium: 12,
  /** 16px — cards, modals, info boxes */
  large:  16,
  /** 24px — bottom sheets, large cards */
  xl:     24,
  /** 999px — pills, avatar circles, full-round buttons */
  full:   999,
} as const;

/**
 * Radius — backward-compatible alias for BorderRadius.
 * Prefer BorderRadius in new code; this alias keeps existing screen imports working.
 */
export const Radius = BorderRadius;

// ─── §5  Shadows ──────────────────────────────────────────────────────────────

/**
 * Shadows — spec-canonical export.
 *   Shadows.card     → standard card shadow
 *   Shadows.elevated → elevated modal / bottom-sheet shadow
 */
export const Shadows = {
  /** Standard card shadow (elevation 3) */
  card: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius:  8,
    elevation:     3,
  },
  /** Elevated modal / bottom-sheet shadow (elevation 8) */
  elevated: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

/**
 * ShadowCard — backward-compatible alias for Shadows.card.
 * Prefer Shadows.card in new code.
 */
export const ShadowCard = Shadows.card;

/**
 * ShadowElevated — backward-compatible alias for Shadows.elevated.
 * Prefer Shadows.elevated in new code.
 */
export const ShadowElevated = Shadows.elevated;
