/**
 * Single source of truth for design values.
 *
 * Naming note: brief listed `bg`, `text`, `border` as semantic names. We renamed
 * them to `canvas`, `ink`, `line` so Tailwind classes read naturally
 * (`bg-canvas` vs `bg-bg`, `text-ink` vs `text-text`, `border-line` vs `border-border`).
 * Hex values are unchanged from the brief.
 */

export const colors = {
  canvas: '#FBFAF7', // warm off-white page background
  surface: '#FFFFFF', // cards, inputs, elevated panels
  line: '#E8E4DC', // borders and dividers
  ink: '#1A1A1A', // primary text
  inkMuted: '#6B6B6B', // secondary text
  accent: '#1D4ED8', // single accent — deep ink blue
  accentHover: '#1842B8', // 6% darken for primary hover
  accentMuted: '#EEF2FF', // subtle accent backgrounds
  success: '#15803D',
  danger: '#B91C1C',
} as const;

export const radius = {
  sm: 6,
  md: 10, // standard
  lg: 16, // large cards
  full: 9999,
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 12px rgba(0,0,0,0.06)',
  lg: '0 12px 32px rgba(0,0,0,0.08)',
} as const;

export const motion = {
  duration: '220ms',
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96] as const;
