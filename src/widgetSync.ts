import { Platform } from 'react-native';

import { type Address, standing } from './scribe';
import type { Palette } from './theme';
import type { List } from './types';
import type { ScrollWidgetProps } from './widgets/ScrollWidget';

const MAX_ITEMS = 9;

let lastPayload: string | null = null;

/** The widget shows the first scroll that still has something to do, or the first scroll at all. */
export const widgetProps = (lists: List[], palette: Palette, address: Address): ScrollWidgetProps => {
  const open = (list: List) => list.items.filter((item) => !item.section && !item.done);
  const list = lists.find((candidate) => open(candidate).length > 0) ?? lists[0];
  const items = list ? open(list) : [];
  return {
    title: list?.name ?? '',
    items: items.slice(0, MAX_ITEMS).map((item) => item.text),
    remaining: items.length,
    note: list ? standing.done(address) : standing.blank(address),
    paper: palette.paperFrom,
    ink: palette.ink,
    faded: palette.inkFaded,
    accent: palette.accent,
  };
};

/** Pushes the current lists to the home screen widget. Safe to call often: it skips unchanged data. */
export const syncWidget = async (lists: List[], palette: Palette, address: Address): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  try {
    const props = widgetProps(lists, palette, address);
    const payload = JSON.stringify(props);
    if (payload === lastPayload) return;
    // Lazy import keeps the native module out of the web bundle.
    const { default: ScrollWidget } = await import('./widgets/ScrollWidget');
    ScrollWidget.updateTimeline([{ date: new Date(), props }]);
    lastPayload = payload;
  } catch (error) {
    // The widget is a convenience; it must never take the app down.
    console.warn('Widget sync failed:', error);
  }
};
