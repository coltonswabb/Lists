import { Platform } from 'react-native';

import { type Address, addresses } from './scribe';
import type { List } from './types';

/** What is currently scheduled with the system, by item id, so only changes are sent to it. */
const scheduled = new Map<string, string>();
let permission: Promise<boolean> | null = null;

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Makes the system's scheduled notifications match the reminders in the lists: one per unfinished
 * item with a time still ahead. Each uses its item's id, so rescheduling replaces rather than duplicates.
 */
export const syncReminders = async (lists: List[], address: Address): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    const now = Date.now();
    const wanted = new Map<string, { at: number; text: string; scroll: string }>();
    for (const list of lists) {
      for (const item of list.items) {
        if (!item.section && !item.done && item.remindAt && item.remindAt > now) {
          wanted.set(item.id, { at: item.remindAt, text: item.text, scroll: list.name });
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

    for (const [id, reminder] of wanted) {
      const signature = `${reminder.at}|${reminder.text}|${address}`;
      if (scheduled.get(id) === signature) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: reminder.scroll,
          body: `${sentence(addresses[address])}, “${reminder.text}” awaits.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
      });
      scheduled.set(id, signature);
    }
  } catch (error) {
    // Reminders are a convenience; a failure here must never disturb the lists themselves.
    console.warn('Reminder sync failed:', error);
  }
};
