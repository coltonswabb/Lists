/**
 * The scribe's calendar: days named by the feasts around them, and hours by the offices of the day.
 * Feasts follow the English calendar; Easter, and the feasts that move with it, are worked out each year.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
/** How far from a feast a day is still named by it: "the Tuesday before Martinmas". */
const NEAR_DAYS = 6;

/** [month (1–12), day, name] */
const FIXED_FEASTS: [number, number, string][] = [
  [1, 5, 'Twelfth Night'],
  [1, 6, 'Epiphany'],
  [2, 2, 'Candlemas'],
  [2, 14, 'St Valentine’s Day'],
  [3, 1, 'St David’s Day'],
  [3, 17, 'St Patrick’s Day'],
  [3, 25, 'Lady Day'],
  [4, 23, 'St George’s Day'],
  [5, 1, 'May Day'],
  [6, 24, 'Midsummer'],
  [7, 15, 'St Swithin’s Day'],
  [8, 1, 'Lammas'],
  [9, 29, 'Michaelmas'],
  [10, 31, 'All Hallows’ Eve'],
  [11, 1, 'All Hallows'],
  [11, 2, 'All Souls'],
  [11, 11, 'Martinmas'],
  [11, 30, 'St Andrew’s Day'],
  [12, 6, 'St Nicholas’s Day'],
  [12, 24, 'Christmas Eve'],
  [12, 25, 'Christmas'],
  [12, 26, 'St Stephen’s Day'],
  [12, 28, 'Childermas'],
];

/** Days counted from Easter Sunday. */
const EASTER_FEASTS: [number, string][] = [
  [-47, 'Shrove Tuesday'],
  [-46, 'Ash Wednesday'],
  [-7, 'Palm Sunday'],
  [-3, 'Maundy Thursday'],
  [-2, 'Good Friday'],
  [0, 'Easter'],
  [39, 'Ascension Day'],
  [49, 'Whitsunday'],
  [56, 'Trinity Sunday'],
  [60, 'Corpus Christi'],
];

const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Easter Sunday, by the anonymous Gregorian computus. */
export const easter = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const feastCache = new Map<number, Map<string, string>>();

const feastsOf = (year: number): Map<string, string> => {
  const cached = feastCache.get(year);
  if (cached) return cached;
  const feasts = new Map<string, string>();
  for (const [month, day, name] of FIXED_FEASTS) feasts.set(dayKey(new Date(year, month - 1, day)), name);
  const sunday = easter(year);
  for (const [offset, name] of EASTER_FEASTS) feasts.set(dayKey(addDays(sunday, offset)), name);
  // Advent Sunday: the Sunday nearest St Andrew's Day, that is, the first on or after 27 November.
  const nov27 = new Date(year, 10, 27);
  feasts.set(dayKey(addDays(nov27, (7 - nov27.getDay()) % 7)), 'Advent Sunday');
  feastCache.set(year, feasts);
  return feasts;
};

export const feastOn = (date: Date): string | undefined => feastsOf(date.getFullYear()).get(dayKey(date));

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** A feast's name as it reads mid-sentence: "Advent Sunday" becomes "Advent", so "before Advent". */
const asLandmark = (feast: string) => feast.replace(/^Advent Sunday$/, 'Advent');

/**
 * A day as the scribe would date it: "Martinmas", "the Monday before Advent", "the Thursday after
 * Candlemas", or plainly "the 3rd day of March" when no feast is near.
 */
export const describeDay = (date: Date): string => {
  const day = midnight(date);
  const feast = feastOn(day);
  if (feast) return feast;
  for (let distance = 1; distance <= NEAR_DAYS; distance += 1) {
    const ahead = feastOn(addDays(day, distance));
    if (ahead) return `the ${WEEKDAYS[day.getDay()]} before ${asLandmark(ahead)}`;
    const behind = feastOn(addDays(day, -distance));
    if (behind) return `the ${WEEKDAYS[day.getDay()]} after ${asLandmark(behind)}`;
  }
  return `the ${ordinal(day.getDate())} day of ${MONTHS[day.getMonth()]}`;
};

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const isSameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
export const daysBetween = (a: Date, b: Date) => Math.round((midnight(b).getTime() - midnight(a).getTime()) / DAY_MS);

/** The canonical hours: when each office of the day was kept, by the clock. */
export const canonicalHours = {
  matins: 3,
  lauds: 5,
  prime: 6,
  terce: 9,
  sext: 12,
  nones: 15,
  vespers: 18,
  compline: 21,
} as const;

export type CanonicalHour = keyof typeof canonicalHours;
const hourNames = Object.keys(canonicalHours) as CanonicalHour[];

export const isCanonicalHour = (value: string): value is CanonicalHour => value in canonicalHours;

/** The office kept at exactly this time, if any: 6pm is vespers. */
export const hourAt = (hour: number, minute: number): CanonicalHour | undefined =>
  minute === 0 ? hourNames.find((name) => canonicalHours[name] === hour) : undefined;

/** The office most recently begun at this time of day: 4pm falls within nones, 1am within compline. */
export const officeOf = (date: Date): CanonicalHour => {
  const hour = date.getHours();
  let current: CanonicalHour = 'compline';
  for (const name of hourNames) if (canonicalHours[name] <= hour) current = name;
  return current;
};
