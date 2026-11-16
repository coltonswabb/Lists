// Written by scripts/import-art.py from the art in assets/art/. Do not edit by hand.

import type { ThemeName } from './theme';

/** An image and its size in pixels. Line drawings are black on transparency, tinted where shown. */
export type Drawing = { source: number; width: number; height: number };

/** Marginal drawings for finished scrolls, in the order of their file names. */
export const marginalia: Drawing[] = [
  { source: require('../assets/art/margin-01.png'), width: 900, height: 321 },
  { source: require('../assets/art/margin-02.png'), width: 900, height: 667 },
  { source: require('../assets/art/margin-03.png'), width: 824, height: 988 },
  { source: require('../assets/art/margin-04.png'), width: 900, height: 729 },
  { source: require('../assets/art/margin-05.png'), width: 717, height: 976 },
  { source: require('../assets/art/margin-06.png'), width: 900, height: 906 },
  { source: require('../assets/art/margin-07.png'), width: 900, height: 390 },
  { source: require('../assets/art/margin-08.png'), width: 900, height: 313 },
  { source: require('../assets/art/margin-09.png'), width: 859, height: 698 },
  { source: require('../assets/art/margin-10.png'), width: 577, height: 896 },
  { source: require('../assets/art/margin-11.png'), width: 592, height: 883 },
  { source: require('../assets/art/margin-12.png'), width: 900, height: 259 },
];

/** Single line drawings by name, when they have been made. */
export const drawings: Partial<Record<'quill' | 'flourish' | 'divider' | 'empty-shelf' | 'initial-frame' | 'tick' | 'strike' | 'nil-found' | 'sky-wheel' | 'sky-corner', Drawing>> = {
  'divider': { source: require('../assets/art/divider.png'), width: 900, height: 66 },
  'empty-shelf': { source: require('../assets/art/empty-shelf.png'), width: 900, height: 883 },
  'flourish': { source: require('../assets/art/flourish.png'), width: 900, height: 898 },
  'initial-frame': { source: require('../assets/art/initial-frame.png'), width: 900, height: 900 },
  'nil-found': { source: require('../assets/art/nil-found.png'), width: 900, height: 677 },
  'quill': { source: require('../assets/art/quill.png'), width: 900, height: 811 },
  'sky-corner': { source: require('../assets/art/sky-corner.png'), width: 900, height: 898 },
  'sky-wheel': { source: require('../assets/art/sky-wheel.png'), width: 900, height: 899 },
  'strike': { source: require('../assets/art/strike.png'), width: 900, height: 35 },
  'tick': { source: require('../assets/art/tick.png'), width: 900, height: 690 },
};

/** The wax seal pressed on a finished scroll, in its own colours. */
export const waxSeal: Drawing | undefined = { source: require('../assets/art/wax-seal.png'), width: 192, height: 191 };

/** A tileable darkening layer that gives every paper a parchment mottle. */
export const parchment: Drawing | undefined = { source: require('../assets/art/parchment.png'), width: 1254, height: 1254 };

/** Tileable desk textures, by paper. A paper without one keeps its plain desk colour. */
export const desks: Partial<Record<ThemeName, Drawing>> = {
  codex: { source: require('../assets/art/desk-codex.png'), width: 512, height: 512 },
  lapis: { source: require('../assets/art/desk-lapis.png'), width: 512, height: 512 },
  scriptorium: { source: require('../assets/art/desk-scriptorium.png'), width: 512, height: 512 },
  verdant: { source: require('../assets/art/desk-verdant.png'), width: 512, height: 512 },
  vigil: { source: require('../assets/art/desk-vigil.png'), width: 512, height: 512 },
};

/** Turned end caps for a scroll's rod, pointing left, in their own colours. */
export const finials: Partial<Record<'brass' | 'iron', Drawing>> = {
  brass: { source: require('../assets/art/finial-brass.png'), width: 200, height: 105 },
  iron: { source: require('../assets/art/finial-iron.png'), width: 200, height: 105 },
};

/** Things lying on the desk, in their own colours. */
export const deskProps: Partial<Record<'inkwell' | 'candle', Drawing>> = {
  inkwell: { source: require('../assets/art/desk-inkwell.png'), width: 423, height: 480 },
  candle: { source: require('../assets/art/desk-candle.png'), width: 251, height: 420 },
};

/** The sun and the moon, in their own colours, for the turn of day and night. */
export const celestial: Partial<Record<'sun' | 'moon', Drawing>> = {
  sun: { source: require('../assets/art/sky-sun.png'), width: 634, height: 640 },
  moon: { source: require('../assets/art/sky-moon.png'), width: 478, height: 560 },
};

/** Full-bleed skies painted behind the sun and the moon. */
export const skies: Partial<Record<'night' | 'dawn', Drawing>> = {
  night: { source: require('../assets/art/sky-night.jpg'), width: 853, height: 1280 },
  dawn: { source: require('../assets/art/sky-dawn.jpg'), width: 853, height: 1280 },
};

/** A tileable scatter of stars, black on transparency, strewn in gold over Night Vigil's desk. */
export const starScatter: Drawing | undefined = { source: require('../assets/art/vigil-stars.png'), width: 512, height: 512 };

/** A vertical, tileable strip of torn edge: opaque where the paper is missing. Tinted as the desk. */
export const deckle: Drawing | undefined = { source: require('../assets/art/deckle-edge.png'), width: 16, height: 1086 };
