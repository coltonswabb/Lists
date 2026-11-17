import { type Address, addresses } from './scribe';
import type { List } from './types';

/** What a scroll is for. It changes the scroll's trim and what the scribe calls the things on it, not how it works. */
export const kindNames = ['decree', 'ledger', 'market', 'quest', 'spell', 'revel', 'missive'] as const;
export type Kind = (typeof kindNames)[number];

/** How an open scroll of a kind is dressed, over whatever paper is chosen. */
export type ScrollTrim = {
  /** A thin wash of colour laid over the whole sheet, as dye, stain or age would be. */
  wash?: string;
  /** The ink the numerals down the margin are written in, and the ground of the headings' painted initials. */
  pigment?: string;
  /** The numerals give off light of this colour, as written words of power do. */
  glow?: string;
  /** A second rule is drawn down the right of the sheet, as in an account book. */
  columns?: boolean;
};

type KindSpec = {
  label: string;
  /** What it is for, in a few words, shown where a kind is chosen. */
  purpose: string;
  /** The ribbon tied round the rolled scroll and the ground of its painted initial. A plain decree has neither. */
  ribbon: string | null;
  trim: ScrollTrim;
  /** Latin for what is left on it, one and many, for the readout. */
  left: [one: string, many: string];
  /** What the scribe says over the open scroll while there is work on it. A plain decree is left in silence. */
  line: (to: Address) => string;
  /** Words in a scroll's name that suggest this kind, when none has been chosen. */
  hints: string[];
};

export const kinds: Record<Kind, KindSpec> = {
  decree: { label: 'Decree', purpose: 'anything at all', ribbon: null, trim: {}, left: ['RES', 'RES'], line: () => '', hints: [] },
  ledger: {
    label: 'Ledger',
    purpose: 'work and business',
    ribbon: '#3f5576',
    // An account book: cool, sober paper, a column ruled off at the right, and plain dark numerals.
    trim: { wash: 'rgba(60,80,110,0.10)', pigment: '#2f3f5a', columns: true },
    left: ['NEGOTIUM', 'NEGOTIA'],
    line: (to) => `To business, ${addresses[to]}.`,
    hints: ['work', 'office', 'job', 'client', 'invoice', 'business', 'meeting', 'email', 'ledger'],
  },
  market: {
    label: 'Market',
    purpose: 'things to buy',
    ribbon: '#5f7d3c',
    // Carried to the stalls and back: paper gone a little green and brown with handling.
    trim: { wash: 'rgba(96,110,40,0.12)', pigment: '#4f6a2f' },
    left: ['EMENDUM', 'EMENDA'],
    line: (to) => `What shall we fetch, ${addresses[to]}?`,
    hints: ['market', 'grocer', 'shop', 'store', 'buy', 'food', 'pantry', 'errand'],
  },
  quest: {
    label: 'Quest',
    purpose: 'goals and ventures',
    ribbon: '#b5782c',
    // A map's paper: sun-browned, with its marks in ochre.
    trim: { wash: 'rgba(150,96,30,0.14)', pigment: '#9a601c' },
    left: ['LABOR', 'LABORES'],
    line: (to) => `Onward, ${addresses[to]}.`,
    hints: ['quest', 'goal', 'project', 'plan', 'trip', 'travel', 'journey', 'build', 'learn'],
  },
  spell: {
    label: 'Spell',
    purpose: 'routines and rituals',
    ribbon: '#6b4192',
    // Vellum dyed violet, the words down its margin giving off their own light.
    trim: { wash: 'rgba(78,36,128,0.26)', pigment: '#5b2f8a', glow: '#b98cff' },
    left: ['VERBUM', 'VERBA'],
    line: (to) => `Speak the words, ${addresses[to]}.`,
    hints: ['spell', 'routine', 'habit', 'ritual', 'morning', 'evening', 'daily', 'workout', 'gym'],
  },
  revel: {
    label: 'Revel',
    purpose: 'play and leisure',
    ribbon: '#ae3d5e',
    // Dressed for a feast: a blush on the paper and rose-red marks.
    trim: { wash: 'rgba(200,90,120,0.10)', pigment: '#a23355' },
    left: ['LUDUS', 'LUDI'],
    line: (to) => `At thy leisure, ${addresses[to]}.`,
    hints: ['revel', 'play', 'fun', 'weekend', 'party', 'game', 'movie', 'watch', 'holiday', 'feast'],
  },
  missive: {
    label: 'Missive',
    purpose: 'people to write or speak to',
    ribbon: '#8f2a2a',
    // A letter: clean paper, marked in the red of sealing wax.
    trim: { wash: 'rgba(255,255,255,0.08)', pigment: '#8f2a2a' },
    left: ['EPISTULA', 'EPISTULAE'],
    line: (to) => `Who must hear of it, ${addresses[to]}?`,
    hints: ['missive', 'letter', 'call', 'write to', 'reply', 'message', 'people', 'thank'],
  },
};

export const isKind = (value: unknown): value is Kind => typeof value === 'string' && (kindNames as readonly string[]).includes(value);

/** The kind a scroll's name suggests: the first whose hint appears in it, or a plain decree. */
export const guessKind = (name: string): Kind => {
  const words = name.toLowerCase();
  return kindNames.find((kind) => kinds[kind].hints.some((hint) => words.includes(hint))) ?? 'decree';
};

/** A scroll's kind: the one chosen for it, or failing that the one its name suggests. The scribe's own scrolls are plain. */
export const kindOf = (list: List): Kind => {
  if (isKind(list.kind)) return list.kind;
  return list.tomorrow || list.tutorial ? 'decree' : guessKind(list.name);
};
