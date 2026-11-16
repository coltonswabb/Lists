export const ROW_HEIGHT = 62;

export const fonts = {
  /** Blackletter, for initials and headings only: it is hard to read at length. */
  display: 'PirataOne_400Regular',
  body: 'IMFellEnglish_400Regular',
  bodyItalic: 'IMFellEnglish_400Regular_Italic',
} as const;

export const colors = {
  parchment: '#ece0c4',
  parchmentShade: '#dfd0ae',
  ink: '#2a2118',
  /** The desk the scroll lies on. */
  desk: '#1b1611',
  inkFaded: 'rgba(42,33,24,0.45)',
  rule: 'rgba(42,33,24,0.16)',
  gold: '#b8892b',
  rubric: '#a3271c',
  complete: '#3f6b4f',
  remove: '#7c1d16',
  onPigment: '#f6edd6',
} as const;

type Hsl = { h: number; s: number; l: number };
type Palette = { from: Hsl; to: Hsl };

/** Manuscript pigments: each row's initial is painted along one of these ramps. */
export const palettes = {
  lists: { from: { h: 221, s: 52, l: 34 }, to: { h: 158, s: 34, l: 32 } },
  items: { from: { h: 6, s: 70, l: 37 }, to: { h: 222, s: 50, l: 34 } },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** Pigment for a row's position: the top of the list is `from`, the bottom is `to`. */
export const rowColor = (palette: PaletteName, index: number, total: number): string => {
  const { from, to } = palettes[palette];
  // Short lists use only part of the ramp so two rows don't jump between extremes.
  const span = Math.min(1, total / 7);
  const t = total > 1 ? (index / (total - 1)) * span : 0;
  // Red to blue goes the short way round the wheel, through violet rather than green.
  const hueTo = to.h - from.h > 180 ? to.h - 360 : to.h;
  const hue = (mix(from.h, hueTo, t) + 360) % 360;
  return `hsl(${hue}, ${mix(from.s, to.s, t)}%, ${mix(from.l, to.l, t)}%)`;
};
