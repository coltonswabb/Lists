import { canonicalHours, hourAt, isCanonicalHour } from './calendar';
import type { Repeat } from './types';

/**
 * Reminders are typed, like sections: "Dentist @ 4:30pm", "Call the bank @ tomorrow 9am", or by the
 * canonical hours, "Feed the hens @ lauds". One that comes round again says how often first:
 * "Feed the hens @ daily lauds", "Take out the ashes @ every monday 7am". The "@ …" part is taken
 * off the text and kept as a time.
 */
const WHEN = String.raw`(tomorrow\s+|tmrw\s+|daily\s+|every\s*day\s+|every\s+[a-z]+\s+|[a-z]+days\s+)?`;
const PATTERN = new RegExp(String.raw`\s@\s*${WHEN}(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$`, 'i');
const HOUR_PATTERN = new RegExp(String.raw`\s@\s*${WHEN}(matins|lauds|prime|terce|sext|nones?|vespers|compline)$`, 'i');

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

type Often = { tomorrow: boolean; daily: boolean; weekday?: number };

/** Reads the word before the time: "tomorrow", "daily", "every monday", "mondays". Null if it is none of these. */
const often = (word: string | undefined): Often | null => {
  const said = (word ?? '').trim().toLowerCase();
  if (!said) return { tomorrow: false, daily: false };
  if (said === 'tomorrow' || said === 'tmrw') return { tomorrow: true, daily: false };
  if (said === 'daily' || /^every\s*day$/.test(said)) return { tomorrow: false, daily: true };
  const day = said.replace(/^every\s+/, '').replace(/s$/, '');
  const weekday = WEEKDAYS.findIndex((name) => day.length >= 3 && name.startsWith(day));
  return weekday < 0 ? null : { tomorrow: false, daily: false, weekday };
};

/** The next moment a time comes round: today if it is still ahead, else tomorrow; or the next such weekday. */
export const nextAt = (now: Date, repeat: Repeat, tomorrow = false): number => {
  const when = new Date(now);
  when.setHours(repeat.hour, repeat.minute, 0, 0);
  let time = when.getTime();
  if (repeat.weekday === undefined) {
    if (tomorrow || time <= now.getTime()) time += DAY_MS;
    return time;
  }
  let days = (repeat.weekday - when.getDay() + 7) % 7;
  if (days === 0 && time <= now.getTime()) days = 7;
  return time + days * DAY_MS;
};

export type ParsedReminder = { text: string; remindAt?: number; repeat?: Repeat };

const build = (raw: string, whole: string, word: string | undefined, hour: number, minute: number, now: Date): ParsedReminder => {
  const how = often(word);
  // "@ every fortnight 9am" is not something the scribe can keep; leave the line as it was written.
  if (!how) return { text: raw };
  const text = raw.slice(0, raw.length - whole.length).trim();
  if (how.daily || how.weekday !== undefined) {
    const repeat: Repeat = how.weekday === undefined ? { hour, minute } : { hour, minute, weekday: how.weekday };
    return { text, remindAt: nextAt(now, repeat), repeat };
  }
  return { text, remindAt: nextAt(now, { hour, minute }, how.tomorrow) };
};

export const parseReminder = (raw: string, now = new Date()): ParsedReminder => {
  const office = HOUR_PATTERN.exec(raw);
  if (office) {
    const [whole, word, name = ''] = office;
    const key = name.toLowerCase().replace(/^none$/, 'nones');
    if (isCanonicalHour(key)) return build(raw, whole, word, canonicalHours[key], 0, now);
  }
  const match = PATTERN.exec(raw);
  if (!match) return { text: raw };
  const [whole, word, hourText = '', minuteText, meridiem] = match;
  let hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  if (hour > 23 || minute > 59) return { text: raw };
  if (meridiem) {
    if (hour < 1 || hour > 12) return { text: raw };
    hour = (hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
  } else if (hour >= 1 && hour <= 7) {
    // A bare "@ 5" almost always means the afternoon.
    hour += 12;
  }
  return build(raw, whole, word, hour, minute, now);
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const clockOf = (hour: number, minute: number) =>
  hourAt(hour, minute) ??
  `${hour % 12 === 0 ? 12 : hour % 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${hour < 12 ? 'am' : 'pm'}`;

/**
 * "4:30pm" or "vespers", with "tomorrow" in front when it is not today, or "daily" or "every monday"
 * for one that comes round again. Round-trips through `parseReminder`: a time set by an office is
 * shown by its office.
 */
export const formatReminder = (remindAt: number, now = new Date(), repeat?: Repeat): string => {
  if (repeat) {
    const clock = clockOf(repeat.hour, repeat.minute);
    return repeat.weekday === undefined ? `daily ${clock}` : `every ${WEEKDAYS[repeat.weekday] ?? 'day'} ${clock}`;
  }
  const when = new Date(remindAt);
  const clock = clockOf(when.getHours(), when.getMinutes());
  if (sameDay(when, now)) return clock;
  if (sameDay(when, new Date(now.getTime() + DAY_MS))) return `tomorrow ${clock}`;
  return clock;
};
