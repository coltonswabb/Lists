import type { Zone } from './progress';
import type { Category } from './types';

/** Rep City: a night skyline lit by a sunset that never quite ends. */
export const colors = {
  background: '#0b0713',
  surface: '#161022',
  surfaceRaised: '#221834',
  border: '#34274d',
  text: '#fff4e6',
  textDim: '#b5a8cc',
  textFaint: '#6f6389',
  ink: '#12071a',
  accent: '#ff3d8b',
  sunset: '#ff8a3d',
  gold: '#ffd23d',
  up: '#2ee6c5',
  down: '#ff4d5e',
  cardio: '#b98cff',
} as const;

/** The signature sunset, left to right. */
export const SUNSET = [colors.accent, colors.sunset, colors.gold] as const;

export const categoryColor: Record<Category, string> = {
  push: '#ff6a3d',
  pull: '#3dc8ff',
  legs: '#8dff6a',
  core: '#ffd23d',
};

export const zoneColor: Record<Zone, string> = {
  raise: colors.gold,
  solid: colors.up,
  heavy: colors.sunset,
  drop: colors.down,
};

export const fonts = {
  display: 'BarlowCondensed_800ExtraBold_Italic',
  heading: 'BarlowCondensed_700Bold',
  label: 'BarlowCondensed_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 10, lg: 14 } as const;

export const MIN_HIT = 44;
