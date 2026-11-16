export const ROW_HEIGHT = 62;

/**
 * Three voices, each with one job: blackletter for names, a monospace for small technical labels,
 * and the system sans for anything the user typed.
 */
export const fonts = {
  display: 'PirataOne_400Regular',
  label: 'IBMPlexMono_500Medium',
} as const;

/** A deliberately small palette: paper, ink and a single accent. Gold is reserved for the scroll's rods. */
export const colors = {
  desk: '#181614',
  parchment: '#ebe3d0',
  parchmentShade: '#ddd3bc',
  ink: '#23201c',
  inkFaded: 'rgba(35,32,28,0.42)',
  rule: 'rgba(35,32,28,0.14)',
  accent: '#d6431f',
  gold: '#ad8a45',
  onDesk: '#ebe3d0',
  onDeskFaded: 'rgba(235,227,208,0.5)',
  complete: '#3f6b4f',
  remove: '#8a2318',
  onAction: '#f6efdf',
} as const;

/** The accent at a strength that falls with position, so the top of a list reads as most pressing. */
export const accentAt = (index: number, total: number): string => {
  const t = total > 1 ? index / (total - 1) : 0;
  return `rgba(214,67,31,${(1 - t * 0.62).toFixed(2)})`;
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
