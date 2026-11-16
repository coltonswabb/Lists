import { canonicalHours, hourAt, isCanonicalHour } from './calendar';

/**
 * Reminders are typed, like sections: "Dentist @ 4:30pm", "Call the bank @ tomorrow 9am", or by the
 * canonical hours, "Feed the hens @ lauds". The "@ …" part is taken off the text and kept as a time.
 */
const PATTERN = /\s@\s*(tomorrow\s+|tmrw\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;
const HOUR_PATTERN = /\s@\s*(tomorrow\s+|tmrw\s+)?(matins|lauds|prime|terce|sext|nones?|vespers|compline)$/i;

const DAY_MS = 24 * 60 * 60 * 1000;

const at = (now: Date, hour: number, minute: number, tomorrow: boolean) => {
  const when = new Date(now);
  when.setHours(hour, minute, 0, 0);
  let time = when.getTime();
  if (tomorrow || time <= now.getTime()) time += DAY_MS;
  return time;
};

export const parseReminder = (raw: string, now = new Date()): { text: string; remindAt?: number } => {
  const office = HOUR_PATTERN.exec(raw);
  if (office) {
    const [whole, tomorrow, name = ''] = office;
    const key = name.toLowerCase().replace(/^none$/, 'nones');
    if (isCanonicalHour(key)) {
      return { text: raw.slice(0, raw.length - whole.length).trim(), remindAt: at(now, canonicalHours[key], 0, !!tomorrow) };
    }
  }
  const match = PATTERN.exec(raw);
  if (!match) return { text: raw };
  const [whole, tomorrow, hourText = '', minuteText, meridiem] = match;
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
  return { text: raw.slice(0, raw.length - whole.length).trim(), remindAt: at(now, hour, minute, !!tomorrow) };
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * "4:30pm" or "vespers", with "tomorrow" in front when it is not today. Round-trips through
 * `parseReminder`: a time set by an office is shown by its office.
 */
export const formatReminder = (remindAt: number, now = new Date()): string => {
  const when = new Date(remindAt);
  const hour = when.getHours();
  const minute = when.getMinutes();
  const clock =
    hourAt(hour, minute) ??
    `${hour % 12 === 0 ? 12 : hour % 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${hour < 12 ? 'am' : 'pm'}`;
  if (sameDay(when, now)) return clock;
  if (sameDay(when, new Date(now.getTime() + DAY_MS))) return `tomorrow ${clock}`;
  return clock;
};
