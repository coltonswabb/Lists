const pad = (value: number): string => String(value).padStart(2, '0');

export const toKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromKey = (key: string): Date => {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const todayKey = (): string => toKey(new Date());

export const addDays = (key: string, count: number): string => {
  const date = fromKey(key);
  date.setDate(date.getDate() + count);
  return toKey(date);
};

export const MONTH_NAMES = [
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

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatLong = (key: string): string => {
  const date = fromKey(key);
  return `${WEEKDAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
};

export const formatShort = (key: string): string => {
  const date = fromKey(key);
  return `${MONTH_NAMES[date.getMonth()]?.slice(0, 3)} ${date.getDate()}`;
};

/** Weeks of a month, Sunday first; null pads the days outside the month. */
export const monthGrid = (year: number, month: number): (string | null)[][] => {
  const leading = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => toKey(new Date(year, month, index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
};
