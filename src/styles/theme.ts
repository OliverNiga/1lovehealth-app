// src/styles/theme.ts
// 2-space indentation
export const colors = {
  // Light theme
  bg: '#fafafa',             // page background
  surface: '#ffffff',        // cards / sheets
  surfaceMuted: '#F6F8FB',   // subtle containers, tab bar, etc.
  textPrimary: '#0B1220',    // near-black
  textSecondary: '#5B6471',  // gray-600
  divider: '#E6E9EF',        // light border
  error: '#E11D48',
  ready: '#806B2F',
  pemf: '#1F7A6B',
  redlight: '#D12E2E',

  // keep a solid accent fallback (first stop of gradient)
  accent: '#20C4DF',
};

export const gradientProps = {
  colors: ['#20C4DF', '#8F48C9'] as const, // your button/ring gradient
  start: { x: 0, y: 0.5 },
  end: { x: 1, y: 0.5 },
};

export const radii = {
  card: 24,
  chip: 16,
  button: 24,
};

export const spacing = {
  outer: 16,
  inner: 8,
};

export const typography = {
  h1: { fontSize: 64, lineHeight: 72, fontWeight: '700' as const, color: colors.textPrimary },
  h2: { fontSize: 24, lineHeight: 28, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const, color: colors.textPrimary },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, color: colors.textSecondary },
};
