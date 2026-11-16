// Written by scripts/import-art.py from the drawings in assets/art/. Do not edit by hand.

/** A line drawing: black ink on transparency, tinted to the paper's ink where it is shown. */
export type Drawing = { source: number; width: number; height: number };

/** Marginal drawings for finished scrolls, in the order of their file names. */
export const marginalia: Drawing[] = [
  { source: require('../assets/art/margin-01.png'), width: 900, height: 321 },
];

/** Single drawings by name, when they have been made. */
export const drawings: Partial<Record<string, Drawing>> = {
};
