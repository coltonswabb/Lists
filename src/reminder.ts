/**
 * Reminders are typed, like sections: "Dentist @ 4:30pm" or "Call the bank @ tomorrow 9am".
 * The "@ …" part is taken off the text and kept as a time.
 */
const PATTERN = /\s@\s*(tomorrow\s+|tmrw\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;

const DAY_MS = 24 * 60 * 60 * 1000;

export const parseReminder = (raw: string, now = new Date()): { text: string; remindAt?: number } => {
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
  const at = new Date(now);
  at.setHours(hour, minute, 0, 0);
  let time = at.getTime();
  if (tomorrow || time <= now.getTime()) time += DAY_MS;
  return { text: raw.slice(0, raw.length - whole.length).trim(), remindAt: time };
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "4:30pm", or "tomorrow 9am" / "12 Mar 9am" when it is not today. Round-trips through `parseReminder`. */
export const formatReminder = (remindAt: number, now = new Date()): string => {
  const at = new Date(remindAt);
  const hour = at.getHours();
  const minute = at.getMinutes();
  const clock = `${hour % 12 === 0 ? 12 : hour % 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${hour < 12 ? 'am' : 'pm'}`;
  if (sameDay(at, now)) return clock;
  if (sameDay(at, new Date(now.getTime() + DAY_MS))) return `tomorrow ${clock}`;
  return clock;
};
