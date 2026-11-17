import { type Address, addresses } from './scribe';
import type { Vellum } from './theme';
import type { List } from './types';

/** What a scroll is for. It changes the scroll's trim and what the scribe calls the things on it, not how it works. */
export const kindNames = ['decree', 'ledger', 'market', 'quest', 'spell', 'revel', 'missive', 'rite'] as const;
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
  /** A line that opens with a name and a colon has the name written in the pigment: who the line is for. */
  names?: boolean;
};

type KindSpec = {
  label: string;
  /** What it is for, in a few words, shown where a kind is chosen. */
  purpose: string;
  /** The ribbon tied round the rolled scroll and the ground of its painted initial. A plain decree has neither. */
  ribbon: string | null;
  trim: ScrollTrim;
  /** A dark kind is written on vellum of its own, in bright ink and foil, whatever the paper chosen. */
  vellum?: Vellum;
  /** Latin for what is left on it, one and many, for the readout. */
  left: [one: string, many: string];
  /** What the scribe says over the open scroll while there is work on it. A plain decree is left in silence. */
  line: (to: Address) => string;
  /** Words in a scroll's name that suggest this kind, when none has been chosen. */
  hints: string[];
  /** What the scribe says as a line on it is struck, in this kind's own manner. `{t}` is the form of address. */
  struck: string[];
  /** What the scribe says when the last line is struck. */
  finished: string;
  /** How the chronicle counts such scrolls once sealed: one, and many. */
  tally: [one: string, many: string];
  /** The light that breaks from under the seal as the scroll is finished. Most have none. */
  flare?: string;
};

export const kinds: Record<Kind, KindSpec> = {
  decree: { label: 'Decree', purpose: 'anything at all', ribbon: null, trim: {}, left: ['RES', 'RES'], line: () => '', hints: [], struck: [], finished: '', tally: ['decree sealed', 'decrees sealed'] },
  ledger: {
    label: 'Ledger',
    purpose: 'work and business',
    ribbon: '#3f5576',
    // An account book: cool, sober paper, a column ruled off at the right, and plain dark numerals.
    trim: { wash: 'rgba(60,80,110,0.10)', pigment: '#2f3f5a', columns: true },
    left: ['NEGOTIUM', 'NEGOTIA'],
    line: (to) => `To business, ${addresses[to]}.`,
    hints: ['work', 'office', 'job', 'client', 'invoice', 'business', 'meeting', 'email', 'ledger'],
    struck: ['Entered, {t}.', 'Balanced, {t}.', 'One matter the fewer, {t}.', 'To the good, {t}.'],
    finished: 'The books are closed, {t}. I shall fetch the wax.',
    tally: ['ledger closed', 'ledgers closed'],
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
    struck: ['In the basket, {t}.', 'Fetched, {t}.', 'A fair price, I trust, {t}.', 'Got, {t}.'],
    finished: 'The basket is full, {t}.',
    tally: ['market filled', 'markets filled'],
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
    struck: ['A league nearer, {t}.', 'Well fought, {t}.', 'Onward, {t}.', 'The road shortens, {t}.'],
    finished: 'The venture is won, {t}. I shall fetch the wax.',
    tally: ['quest won', 'quests won'],
  },
  spell: {
    label: 'Spell',
    purpose: 'what must not be forgotten',
    ribbon: '#6b4192',
    // Vellum dyed deep violet, written in silver, its numerals and initials in gold foil that gives off its own light.
    trim: { pigment: '#e6c56a', glow: '#e2c064' },
    vellum: { from: '#2c1845', to: '#42245f', ink: '#edebf6', foil: '#e6c56a' },
    left: ['VERBUM', 'VERBA'],
    line: (to) => `These must not fail, ${addresses[to]}.`,
    hints: ['spell', 'important', 'urgent', 'must', 'deadline', 'due', 'priority', 'critical'],
    struck: ['The word is spoken, {t}.', 'It holds, {t}.', 'Bound, {t}.', 'None shall know, {t}.'],
    finished: 'It is cast, {t}.',
    tally: ['spell cast', 'spells cast'],
    flare: '#e2c064',
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
    struck: ['Huzzah, {t}!', 'Merrily done, {t}.', 'A fine sport, {t}.', 'More wine, {t}?'],
    finished: 'A revel well kept, {t}. I shall fetch the wax.',
    tally: ['revel kept', 'revels kept'],
  },
  missive: {
    label: 'Missive',
    purpose: 'people to write or speak to',
    ribbon: '#8f2a2a',
    // A letter: clean paper, marked in the red of sealing wax.
    trim: { wash: 'rgba(255,255,255,0.08)', pigment: '#8f2a2a', names: true },
    left: ['EPISTULA', 'EPISTULAE'],
    line: (to) => `Who must hear of it, ${addresses[to]}?`,
    hints: ['missive', 'letter', 'call', 'write to', 'reply', 'message', 'people', 'thank'],
    struck: ['They have word of it, {t}.', 'Sent, {t}.', 'The rider is away, {t}.', 'Told, {t}.'],
    finished: 'All have been told, {t}. I shall fetch the wax.',
    tally: ['missive sent', 'missives sent'],
  },
  rite: {
    label: 'Rite',
    purpose: 'habits and daily routines',
    ribbon: '#2f7f7a',
    // Kept like a book of hours: calm, sea-green paper, turned to every day.
    trim: { wash: 'rgba(40,120,115,0.10)', pigment: '#256660' },
    left: ['RITUS', 'RITUS'],
    line: (to) => `As every day, ${addresses[to]}.`,
    hints: ['rite', 'routine', 'habit', 'ritual', 'morning', 'evening', 'daily', 'workout', 'gym'],
    struck: ['As ever, {t}.', 'Observed, {t}.', 'Faithfully done, {t}.', 'The day is kept, {t}.'],
    finished: 'The day’s rite is kept, {t}.',
    tally: ['rite kept', 'rites kept'],
  },
};

export const isKind = (value: unknown): value is Kind => typeof value === 'string' && (kindNames as readonly string[]).includes(value);

/** The kind a scroll's name suggests: the first whose hint appears in it, or a plain decree. */
export const guessKind = (name: string): Kind => {
  const words = name.toLowerCase();
  // What must not fail is asked first: "urgent work" is a spell before it is a ledger.
  const asked: Kind[] = ['spell', ...kindNames.filter((kind) => kind !== 'spell')];
  return asked.find((kind) => kinds[kind].hints.some((hint) => words.includes(hint))) ?? 'decree';
};

/** A scroll's kind: the one chosen for it, or failing that the one its name suggests. The scribe's own scrolls are plain. */
export const kindOf = (list: List): Kind => {
  if (isKind(list.kind)) return list.kind;
  return list.tomorrow || list.tutorial ? 'decree' : guessKind(list.name);
};
