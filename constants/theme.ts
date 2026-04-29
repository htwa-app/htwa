/**
 * HTWA Design Tokens
 * Single source of truth for all colours, typography, spacing, border radius, and shadows.
 * Every value maps directly to DESIGN-SPEC.md. Never hardcode these values elsewhere.
 */

// ─── Colours ──────────────────────────────────────────────────────────────────

export const Colors = {
  /** Primary teal — buttons, links, active states, route chips, icons */
  primary: '#1F7A78',
  /** Teal tint — secondary button backgrounds, teal tint surfaces */
  primaryLight: '#E8F4F4',
  /** Lavender accent — women-only mode, accent surfaces, info boxes */
  lavender: '#C8B8E8',
  /** Lavender tint — lavender tint backgrounds */
  lavenderLight: '#F0EBF8',
  /** Warm amber — savings callouts, highlights */
  amber: '#E8A55A',
  /** Amber tint — amber tint backgrounds */
  amberLight: '#FDF3E7',
  /** Screen background — always off-white, never cold grey */
  background: '#F7F3ED',
  /** Surface — cards, modals, input fields */
  surface: '#FFFFFF',
  /** Primary text — all primary body text and headings */
  textPrimary: '#2A251F',
  /** Secondary text — subtitles, captions, placeholder text */
  textSecondary: 'rgba(40,30,20,0.55)',
  /** Tertiary text — disabled states, fine print */
  textTertiary: 'rgba(40,30,20,0.35)',
  /** Border — card borders, dividers, input borders */
  border: 'rgba(40,30,20,0.10)',
  /** Verified badge — iOS system green */
  verified: '#34C759',
  /** Silent SOS button — used only on live trip screen */
  sos: '#FF3B30',
  /** Soft card shadow colour */
  shadow: 'rgba(0,0,0,0.07)',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

/** Font family — Poppins primary, system-ui fallback */
export const FontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/**
 * Text styles — use as spread props on Text components.
 * Line heights are expressed as multiples (React Native uses absolute px; multiply by fontSize).
 */
export const Typography = {
  /** App name, hero headings — 32px / 700 */
  displayLarge: { fontSize: 32, fontFamily: FontFamily.bold, lineHeight: 35 },
  /** Screen titles — 24px / 600 */
  displayMedium: { fontSize: 24, fontFamily: FontFamily.semiBold, lineHeight: 29 },
  /** Section headings — 20px / 600 */
  headingLarge: { fontSize: 20, fontFamily: FontFamily.semiBold, lineHeight: 26 },
  /** Card titles, list headings — 17px / 600 */
  headingMedium: { fontSize: 17, fontFamily: FontFamily.semiBold, lineHeight: 22 },
  /** Sub-headings — 15px / 600 */
  headingSmall: { fontSize: 15, fontFamily: FontFamily.semiBold, lineHeight: 21 },
  /** Primary body text — 16px / 400 */
  bodyLarge: { fontSize: 16, fontFamily: FontFamily.regular, lineHeight: 24 },
  /** Secondary body text — 14px / 400 */
  bodyMedium: { fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 21 },
  /** Captions, metadata — 12px / 400 */
  bodySmall: { fontSize: 12, fontFamily: FontFamily.regular, lineHeight: 18 },
  /** Chips, badges, tags — 12px / 500 */
  label: { fontSize: 12, fontFamily: FontFamily.medium, lineHeight: 17 },
  /** Legal text, fine print — 10px / 400 */
  micro: { fontSize: 10, fontFamily: FontFamily.regular, lineHeight: 14 },
  /** All button labels — 16px / 600 */
  button: { fontSize: 16, fontFamily: FontFamily.semiBold, lineHeight: 16 },
  /** Small button labels — 14px / 600 */
  buttonSmall: { fontSize: 14, fontFamily: FontFamily.semiBold, lineHeight: 14 },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  /** Horizontal padding on all screens */
  screenPadding: 20,
  /** Internal padding on cards */
  cardPadding: 16,
  /** Gap between major sections */
  sectionGap: 24,
  /** Gap between list items */
  itemGap: 12,
  /** All text input fields */
  inputHeight: 52,
  /** Primary buttons */
  buttonHeight: 52,
  /** Secondary/small buttons */
  buttonHeightSmall: 40,
  /** Bottom tab bar */
  tabBarHeight: 60,
  /** Navigation header */
  headerHeight: 56,
  // Base scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const Radius = {
  /** Chips, badges, small tags */
  small: 8,
  /** Input fields, small cards */
  medium: 12,
  /** Cards, modals, info boxes */
  large: 16,
  /** Bottom sheets, large cards */
  xl: 24,
  /** Pills, avatar circles, full-round buttons */
  full: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

/** Standard card shadow */
export const ShadowCard = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
} as const;

/** Elevated modal/sheet shadow */
export const ShadowElevated = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 16,
  elevation: 8,
} as const;
