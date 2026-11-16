export const ROW_HEIGHT = 62;

export const colors = {
  background: '#101014',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.45)',
  doneRow: '#1c1c22',
  complete: '#2fbf71',
  remove: '#e5484d',
} as const;

type Hsl = { h: number; s: number; l: number };
type Palette = { from: Hsl; to: Hsl };

export const palettes = {
  lists: { from: { h: 222, s: 62, l: 46 }, to: { h: 204, s: 70, l: 34 } },
  items: { from: { h: 264, s: 68, l: 56 }, to: { h: 180, s: 62, l: 40 } },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** Row colour for its position: the top of the list is `from`, the bottom is `to`. */
export const rowColor = (palette: PaletteName, index: number, total: number): string => {
  const { from, to } = palettes[palette];
  // Short lists use only part of the range so two rows don't jump between extremes.
  const span = Math.min(1, total / 7);
  const t = total > 1 ? (index / (total - 1)) * span : 0;
  return `hsl(${mix(from.h, to.h, t)}, ${mix(from.s, to.s, t)}%, ${mix(from.l, to.l, t)}%)`;
};
