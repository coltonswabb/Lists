export const ROW_HEIGHT = 62;

/**
 * Two hands, as in a manuscript: blackletter for names, and an old-style serif for everything else:
 * numerals and readouts, what the user typed, what the scribe says, and anything that can be pressed.
 */
export const fonts = {
  display: 'PirataOne_400Regular',
  label: 'EBGaramond_500Medium',
  body: 'EBGaramond_500Medium',
  bodyItalic: 'EBGaramond_500Medium_Italic',
} as const;

/**
 * A theme is deliberately small: a desk, a paper that shades smoothly from one tone to another down
 * the scroll, an ink, and a single accent. Everything else is derived.
 */
type ThemeSpec = {
  label: string;
  desk: string;
  /** Paper at the top of a scroll. */
  paperFrom: string;
  /** Paper at the bottom of a scroll. */
  paperTo: string;
  ink: string;
  accent: string;
  rod: string;
  onDesk: string;
};

export const themes = {
  scriptorium: {
    label: 'Scriptorium',
    desk: '#181614',
    paperFrom: '#f5e9c9',
    paperTo: '#e6ad5c',
    ink: '#23201c',
    accent: '#bf3418',
    rod: '#ad8a45',
    onDesk: '#ebe3d0',
  },
  vigil: {
    label: 'Night Vigil',
    desk: '#0c0b0a',
    paperFrom: '#2c2824',
    paperTo: '#5c3c1d',
    ink: '#efe6d2',
    accent: '#f0a43f',
    rod: '#6f5a32',
    onDesk: '#e6dcc6',
  },
  lapis: {
    label: 'Lapis',
    desk: '#10141d',
    paperFrom: '#eef1f6',
    paperTo: '#86a8dd',
    ink: '#14244c',
    accent: '#a12a20',
    rod: '#b8963f',
    onDesk: '#e3e8f2',
  },
  verdant: {
    label: 'Verdant',
    desk: '#121610',
    paperFrom: '#f3eed8',
    paperTo: '#a3bd84',
    ink: '#1e3223',
    accent: '#7c1d16',
    rod: '#9a8444',
    onDesk: '#e6e6d2',
  },
  codex: {
    label: 'Purple Codex',
    desk: '#120c16',
    paperFrom: '#45285a',
    paperTo: '#84407f',
    ink: '#ece7f2',
    accent: '#e4b651',
    rod: '#b8963f',
    onDesk: '#e3dcea',
  },
} as const satisfies Record<string, ThemeSpec>;

export type ThemeName = keyof typeof themes;
export const themeNames = Object.keys(themes) as ThemeName[];
export const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && value in themes;

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const alpha = (hex: string, opacity: number) => `rgba(${toRgb(hex).join(',')},${opacity})`;

export const mixColors = (from: string, to: string, t: number): string => {
  const a = toRgb(from);
  const b = toRgb(to);
  const channel = (i: 0 | 1 | 2) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)},${channel(1)},${channel(2)})`;
};

export const paletteOf = (name: ThemeName) => {
  const spec: ThemeSpec = themes[name];
  return {
    ...spec,
    name,
    parchment: spec.paperFrom,
    inkFaded: alpha(spec.ink, 0.45),
    rule: alpha(spec.ink, 0.14),
    gold: spec.rod,
    onDeskFaded: alpha(spec.onDesk, 0.5),
    // The two pigments behind a swiped row, from a manuscript's box rather than a traffic light:
    // gold leaf where a line is struck done, oxblood where it is cast out.
    complete: '#c9a44e',
    onComplete: '#2a2013',
    remove: '#6b1a14',
    onAction: '#f3dfae',
  };
};

export type Palette = ReturnType<typeof paletteOf>;

/** Paper for a row's position: the scroll shades smoothly from `paperFrom` at the top to `paperTo` at the bottom. */
export const paperAt = (palette: Palette, index: number, total: number, done = false): string => {
  const t = total > 0 ? Math.min(1, index / total) : 0;
  const paper = mixColors(palette.paperFrom, palette.paperTo, t);
  if (!done) return paper;
  const [r, g, b] = paper.slice(4, -1).split(',').map(Number) as Rgb;
  const [dr, dg, db] = toRgb(palette.desk);
  const sink = (c: number, d: number) => Math.round(c + (d - c) * 0.16);
  return `rgb(${sink(r, dr)},${sink(g, dg)},${sink(b, db)})`;
};

/** The accent at a strength that falls with position, so the top of a list reads as most pressing. */
export const accentAt = (palette: Palette, index: number, total: number): string => {
  const t = total > 1 ? index / (total - 1) : 0;
  return alpha(palette.accent, Number((1 - t * 0.45).toFixed(2)));
};

const NUMERALS = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
] as const;

export const roman = (value: number): string => {
  if (value <= 0) return 'NIL';
  let rest = Math.floor(value);
  let out = '';
  for (const [size, glyph] of NUMERALS) {
    while (rest >= size) {
      out += glyph;
      rest -= size;
    }
  }
  return out;
};
