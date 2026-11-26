import type { Category } from './types';

export const colors = {
  background: '#0e0f11',
  surface: '#17191d',
  surfaceRaised: '#1f2227',
  border: '#2a2e35',
  text: '#f2f3f5',
  textDim: '#9aa1ad',
  textFaint: '#626976',
  accent: '#5b9dff',
  up: '#4cc38a',
  down: '#ef6b6b',
  raise: '#f2b84b',
  cardio: '#c58bff',
} as const;

export const categoryColor: Record<Category, string> = {
  push: '#ff8a5b',
  pull: '#5b9dff',
  legs: '#4cc38a',
  core: '#f2b84b',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;

export const MIN_HIT = 44;
