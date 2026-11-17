import { type Address, addresses } from './scribe';
import { colorGap, type Palette, type Vellum } from './theme';
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
  /** The lines are numbered in plain figures with a stop, as entries in an account book are. */
  figures?: boolean;
  /** The lines are numbered in runes, not numerals. */
  runes?: boolean;
  /** One mark stands in the margin of every line in place of its number, for a list with no order to it. */
  mark?: string;
  /** A dotted trail runs down the margin, as a route does on a map. */
  trail?: boolean;
  /** A line that opens with a name and a colon has the name written in the pigment: who the line is for. */
  names?: boolean;
};

type KindSpec = {
  label: string;
  /** What it is for, in a few words, shown where a kind is chosen. */
  purpose: string;
  /** A small sign for the kind, set beside a rolled scroll's count so its kind can be told on the shelf. A plain decree has none. */
  emblem: string | null;
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
  decree: { label: 'Decree', purpose: 'anything at all', emblem: null, ribbon: null, trim: {}, left: ['RES', 'RES'], line: () => '', hints: [], struck: [], finished: '', tally: ['decree sealed', 'decrees sealed'] },
  ledger: {
    label: 'Ledger',
    purpose: 'work and business',
    emblem: '§',
    ribbon: '#3f5576',
    // An account book: cool, sober paper, its entries numbered in plain figures.
    trim: { wash: 'rgba(60,80,110,0.10)', pigment: '#2f3f5a', figures: true },
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
    emblem: '❧',
    ribbon: '#5f7d3c',
    // Carried to the stalls and back: paper gone a little green and brown with handling.
    trim: { wash: 'rgba(96,110,40,0.12)', pigment: '#4f6a2f', mark: '❧' },
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
    emblem: '✥',
    ribbon: '#b5782c',
    // A map's paper: sun-browned, with its marks in ochre.
    trim: { wash: 'rgba(150,96,30,0.14)', pigment: '#9a601c', trail: true },
    left: ['LABOR', 'LABORES'],
    line: (to) => `Onward, ${addresses[to]}.`,
    hints: ['quest', 'goal', 'project', 'plan', 'trip', 'travel', 'journey', 'build', 'learn'],
    struck: ['A league nearer, {t}.', 'Well fought, {t}.', 'Onward, {t}.', 'The road shortens, {t}.'],
    finished: 'The venture is won, {t}. I shall fetch the wax.',
    tally: ['quest won', 'quests won'],
    flare: '#d9912f',
  },
  spell: {
    label: 'Spell',
    purpose: 'what must not be forgotten',
    emblem: 'ᛟ',
    ribbon: '#6b4192',
    // Vellum dyed deep violet, written in silver, its numerals and initials in gold foil that gives off its own light.
    trim: { pigment: '#e6c56a', glow: '#e2c064', runes: true },
    vellum: { from: '#482a6c', to: '#2a1643', ink: '#edebf6', foil: '#e6c56a' },
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
    emblem: '✦',
    ribbon: '#ae3d5e',
    // Dressed for a feast: a blush on the paper and rose-red marks.
    trim: { wash: 'rgba(200,90,120,0.10)', pigment: '#a23355', mark: '✦', glow: '#ffb3c8' },
    left: ['LUDUS', 'LUDI'],
    line: (to) => `At thy leisure, ${addresses[to]}.`,
    hints: ['revel', 'play', 'fun', 'weekend', 'party', 'game', 'movie', 'watch', 'holiday', 'feast'],
    struck: ['Huzzah, {t}!', 'Merrily done, {t}.', 'A fine sport, {t}.', 'More wine, {t}?'],
    finished: 'A revel well kept, {t}. I shall fetch the wax.',
    tally: ['revel kept', 'revels kept'],
    flare: '#e0557f',
  },
  missive: {
    label: 'Missive',
    purpose: 'people to write or speak to',
    emblem: '☙',
    ribbon: '#8f2a2a',
    // A letter: clean paper, marked in the red of sealing wax.
    trim: { wash: 'rgba(255,255,255,0.08)', pigment: '#8f2a2a', names: true, mark: '☙' },
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
    emblem: '☩',
    ribbon: '#2f7f7a',
    // Kept like a book of hours: calm, sea-green paper, turned to every day.
    trim: { wash: 'rgba(40,120,115,0.10)', pigment: '#256660', mark: '☩' },
    left: ['RITUS', 'RITUS'],
    line: (to) => `As every day, ${addresses[to]}.`,
    hints: ['rite', 'routine', 'habit', 'ritual', 'morning', 'evening', 'daily', 'workout', 'gym'],
    struck: ['As ever, {t}.', 'Observed, {t}.', 'Faithfully done, {t}.', 'The day is kept, {t}.'],
    finished: 'The day’s rite is kept, {t}.',
    tally: ['rite kept', 'rites kept'],
    flare: '#3aa59e',
  },
};

/** The elder runes in their order, which stand for a spell's line numbers: the first line ᚠ, the second ᚢ, and so on. */
const RUNES = [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'];

/** A number in runes: one rune up to twenty-four, then two. */
export const runeOf = (value: number): string => {
  if (value <= 0) return '';
  const at = value - 1;
  const last = RUNES[at % RUNES.length] ?? '';
  return at < RUNES.length ? last : `${RUNES[Math.floor(at / RUNES.length) - 1] ?? ''}${last}`;
};

/** What a dark kind is written on where its own vellum would be lost against the paper: black, with the same bright ink and foil. */
const BLACK_VELLUM = { from: '#221d28', to: '#0d0b11' };
/** Closer than this to the paper, a vellum no longer stands out from it. */
const TOO_LIKE = 60;

/**
 * The vellum a kind of scroll is written on, on this paper. A dark kind must stand out from the scrolls round
 * it, so on a paper of nearly its own colour, as a spell's violet is on a purple paper, it is black instead.
 */
export const vellumOf = (kind: Kind, palette: Palette): Vellum | undefined => {
  const vellum = kinds[kind].vellum;
  if (!vellum) return undefined;
  const lost = colorGap(vellum.from, palette.paperFrom) < TOO_LIKE || colorGap(vellum.to, palette.paperTo) < TOO_LIKE || colorGap(vellum.from, palette.paperTo) < TOO_LIKE;
  return lost ? { ...vellum, ...BLACK_VELLUM } : vellum;
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
