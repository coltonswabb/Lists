import { Platform } from 'react-native';

import { type Address, addresses } from './scribe';
import type { List, Repeat } from './types';

/** What is currently scheduled with the system, by item id, so only changes are sent to it. */
const scheduled = new Map<string, string>();
let permission: Promise<boolean> | null = null;
let categorised: Promise<unknown> | null = null;

/** The kind of notification a reminder is, which gives it its two buttons. No ":" or "-": the system forbids them. */
const CATEGORY = 'reminder';
const STRIKE = 'strike';
const LATER = 'later';

export type ReminderAction = typeof STRIKE | typeof LATER;

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type Wanted = { at: number; repeat?: Repeat; text: string; scroll: string; listId: string };

/**
 * Makes the system's scheduled notifications match the reminders in the lists: one per unfinished
 * item with a time still ahead, or one that comes round daily or weekly. Each uses its item's id,
 * so rescheduling replaces rather than duplicates.
 */
export const syncReminders = async (lists: List[], address: Address): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    const now = Date.now();
    const wanted = new Map<string, Wanted>();
    for (const list of lists) {
      for (const item of list.items) {
        if (item.section || item.done || !item.remindAt) continue;
        // A repeating reminder is always still to come; a single one only until its time has passed.
        if (item.repeat || item.remindAt > now) {
          wanted.set(item.id, { at: item.remindAt, repeat: item.repeat, text: item.text, scroll: list.name, listId: list.id });
        }
      }
    }
    if (wanted.size === 0 && scheduled.size === 0) return;

    // Lazy import keeps the native module out of the web bundle.
    const Notifications = await import('expo-notifications');

    for (const id of [...scheduled.keys()]) {
      if (!wanted.has(id)) {
        scheduled.delete(id);
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
    if (wanted.size === 0) return;

    permission ??= Notifications.requestPermissionsAsync().then((status) => status.granted);
    if (!(await permission)) return;

    // The buttons must be known to the system before a reminder that carries them is scheduled.
    categorised ??= Notifications.setNotificationCategoryAsync(CATEGORY, [
      { identifier: STRIKE, buttonTitle: 'Strike it', options: { opensAppToForeground: false } },
      { identifier: LATER, buttonTitle: 'In an hour', options: { opensAppToForeground: false } },
    ]).catch(() => undefined);
    await categorised;

    for (const [id, reminder] of wanted) {
      const { repeat } = reminder;
      const when = repeat ? `${repeat.weekday ?? 'daily'}@${repeat.hour}:${repeat.minute}` : String(reminder.at);
      const signature = `${when}|${reminder.text}|${address}`;
      if (scheduled.get(id) === signature) continue;
      const { DATE, DAILY, WEEKLY } = Notifications.SchedulableTriggerInputTypes;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: reminder.scroll,
          body: `${sentence(addresses[address])}, “${reminder.text}” awaits.`,
          categoryIdentifier: CATEGORY,
          data: { listId: reminder.listId, itemId: id },
        },
        trigger: !repeat
          ? { type: DATE, date: reminder.at }
          : repeat.weekday === undefined
            ? { type: DAILY, hour: repeat.hour, minute: repeat.minute }
            : // The system counts weekdays from 1 for Sunday; the lists count from 0.
              { type: WEEKLY, weekday: repeat.weekday + 1, hour: repeat.hour, minute: repeat.minute },
      });
      scheduled.set(id, signature);
    }
  } catch (error) {
    // Reminders are a convenience; a failure here must never disturb the lists themselves.
    console.warn('Reminder sync failed:', error);
  }
};

/**
 * Calls back when one of a reminder's buttons is pressed, including a press made while the app was
 * closed, which is handed over once when it next opens. Returns a function that stops listening.
 */
export const listenForReminderActions = (
  onAction: (action: ReminderAction, listId: string, itemId: string) => void,
): (() => void) => {
  if (Platform.OS === 'web') return () => undefined;
  let stopped = false;
  let stop: (() => void) | undefined;
  const handled = new Set<string>();

  void import('expo-notifications')
    .then(async (Notifications) => {
      const act = (response: { actionIdentifier: string; notification: { date: number; request: { identifier: string; content: { data?: Record<string, unknown> } } } }) => {
        const action = response.actionIdentifier;
        if (action !== STRIKE && action !== LATER) return;
        const { listId, itemId } = response.notification.request.content.data ?? {};
        if (typeof listId !== 'string' || typeof itemId !== 'string') return;
        // The same press can be delivered by the listener and found again as the last response.
        const key = `${response.notification.request.identifier}|${response.notification.date}|${action}`;
        if (handled.has(key)) return;
        handled.add(key);
        onAction(action, listId, itemId);
      };
      if (stopped) return;
      const subscription = Notifications.addNotificationResponseReceivedListener(act);
      stop = () => subscription.remove();
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last && !stopped) {
        act(last);
        await Notifications.clearLastNotificationResponseAsync();
      }
    })
    .catch((error: unknown) => console.warn('Reminder buttons unavailable:', error));

  return () => {
    stopped = true;
    stop?.();
  };
};
