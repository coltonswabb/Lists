import { feastOn } from './calendar';

/** How the scribe addresses the user. Chosen once, on first launch. */
export type Address = 'lord' | 'lady' | 'liege';

export const addresses = {
  lord: 'M’lord',
  lady: 'M’lady',
  liege: 'my liege',
} as const satisfies Record<Address, string>;

/** How much the scribe says: everything, only the greeting and finished scrolls, or nothing at all. */
export type ScribeMode = 'chatty' | 'quiet' | 'silent';
export const scribeModes: ScribeMode[] = ['chatty', 'quiet', 'silent'];
export const isScribeMode = (value: unknown): value is ScribeMode =>
  typeof value === 'string' && (scribeModes as string[]).includes(value);

export const isAddress = (value: unknown): value is Address => typeof value === 'string' && value in addresses;

/** Things the scribe remarks on as they happen. `{t}` is replaced by the form of address. */
const remarks = {
  add: ['So it is written.', 'Duly noted, {t}.', 'It is set down, {t}.'],
  complete: ['Very good, {t}.', 'It is done, {t}.', 'As thou wishest, {t}.', 'Most excellent, {t}.'],
  strike: ['Struck from the record.', 'Consider it forgotten, {t}.', 'It never was, {t}.'],
  finish: ['All is done, {t}. I shall fetch the wax.'],
  restore: ['As it was, {t}.', 'Restored, {t}.'],
  penning: ['Penning, {t}.', 'I dip the quill, {t}.', 'Quill at hand, {t}.'],
  nightfall: [
    'Night is upon us, {t}.',
    '{t} plans most fiercely by night.',
    'Darkness, {t}. Excellent for secrets.',
    'The owls keep the same hours, {t}.',
    'I shall mind the candle, {t}. Mostly.',
  ],
  daybreak: [
    'A new day dawns, {t}.',
    'The cock crows, {t}. Rudely.',
    'Morning already? I had only just sharpened the quill.',
    'The sun returns, {t}, as promised.',
    '{t} rises before the bakers.',
  ],
  pattern: ['Kept as a pattern, {t}.', 'I shall remember its shape, {t}.'],
  fromPattern: ['Cut to the pattern, {t}.', 'As before, {t}.'],
  newScroll: ['A fresh scroll, {t}.', 'I have cut a new sheet, {t}.'],
  bigClear: ['A fine day’s work, {t}.', 'The page breathes again, {t}.'],
  seal: ['Sealed, and set down in the chronicle.', 'I have pressed the wax, {t}.'],
  renew: ['It shall be renewed each dawn, {t}.'],
  moved: ['Carried over, {t}.', 'It is moved, {t}.'],
} as const;

export type Remark = keyof typeof remarks;

let address: Address = 'liege';
let mode: ScribeMode = 'chatty';
/** What a quiet scribe still thinks worth saying. */
const worthSaying: Remark[] = ['finish', 'bigClear', 'seal'];

export const setScribeMode = (value: ScribeMode) => {
  mode = value;
};
const listeners = new Set<(line: string) => void>();

export const setScribeAddress = (value: Address) => {
  address = value;
};

/** A line that stays on screen until something happens, such as the greeting. */
export const standing = {
  welcome: (to: Address, hour = new Date().getHours()) => {
    const greeting =
      hour < 5 ? 'Thou art up late' : hour < 12 ? 'Good morrow' : hour < 17 ? 'Good day' : hour < 22 ? 'Good even' : 'Thou art up late';
    const feast = feastOn(new Date());
    return feast ? `${greeting}, ${addresses[to]}. ’Tis ${feast}.` : `${greeting}, ${addresses[to]}.`;
  },
  dust: (scroll: string, to: Address) => `“${scroll}” gathers dust, ${addresses[to]}.`,
  decree: (to: Address) => `What is thy decree, ${addresses[to]}?`,
  blank: (to: Address) => `The page awaits, ${addresses[to]}.`,
  done: (to: Address) => `All is done, ${addresses[to]}.`,
} as const;

/** Has the scribe pass a brief remark. */
export const say = (remark: Remark) => {
  if (mode === 'silent' || (mode === 'quiet' && !worthSaying.includes(remark))) return;
  const options = remarks[remark];
  const line = options[Math.floor(Math.random() * options.length)] ?? options[0];
  // A line may open with the form of address, which then takes a capital ("My liege plans…").
  const title = addresses[address];
  const spoken = line.startsWith('{t}')
    ? line.replace('{t}', title.charAt(0).toUpperCase() + title.slice(1))
    : line.replace('{t}', title);
  listeners.forEach((listener) => listener(spoken));
};

export const listen = (listener: (line: string) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
