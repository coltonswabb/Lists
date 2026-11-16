// Written by scripts/import-art.py from the art in assets/art/. Do not edit by hand.

import type { ThemeName } from './theme';

/** An image and its size in pixels. Line drawings are black on transparency, tinted where shown. */
export type Drawing = { source: number; width: number; height: number };

/** Marginal drawings for finished scrolls, in the order of their file names. */
export const marginalia: Drawing[] = [
  { source: require('../assets/art/margin-01.png'), width: 900, height: 321 },
  { source: require('../assets/art/margin-02.png'), width: 900, height: 667 },
  { source: require('../assets/art/margin-03.png'), width: 824, height: 987 },
  { source: require('../assets/art/margin-04.png'), width: 900, height: 729 },
  { source: require('../assets/art/margin-05.png'), width: 717, height: 976 },
  { source: require('../assets/art/margin-06.png'), width: 900, height: 906 },
  { source: require('../assets/art/margin-07.png'), width: 900, height: 390 },
  { source: require('../assets/art/margin-08.png'), width: 900, height: 313 },
  { source: require('../assets/art/margin-09.png'), width: 859, height: 698 },
  { source: require('../assets/art/margin-10.png'), width: 577, height: 896 },
  { source: require('../assets/art/margin-11.png'), width: 592, height: 883 },
  { source: require('../assets/art/margin-12.png'), width: 900, height: 260 },
];

/** Single line drawings by name, when they have been made. */
export const drawings: Partial<Record<'quill' | 'flourish' | 'divider' | 'empty-shelf', Drawing>> = {
  'divider': { source: require('../assets/art/divider.png'), width: 900, height: 67 },
  'empty-shelf': { source: require('../assets/art/empty-shelf.png'), width: 900, height: 883 },
  'flourish': { source: require('../assets/art/flourish.png'), width: 900, height: 898 },
  'quill': { source: require('../assets/art/quill.png'), width: 900, height: 811 },
};

/** The wax seal pressed on a finished scroll, in its own colours. */
export const waxSeal: Drawing | undefined = { source: require('../assets/art/wax-seal.png'), width: 192, height: 191 };

/** A tileable darkening layer that gives every paper a parchment mottle. */
export const parchment: Drawing | undefined = { source: require('../assets/art/parchment.png'), width: 1254, height: 1254 };

/** Tileable desk textures, by paper. A paper without one keeps its plain desk colour. */
export const desks: Partial<Record<ThemeName, Drawing>> = {
  scriptorium: { source: require('../assets/art/desk-scriptorium.png'), width: 512, height: 512 },
  vigil: { source: require('../assets/art/desk-vigil.png'), width: 512, height: 512 },
};
