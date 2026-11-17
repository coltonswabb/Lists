import { Platform } from 'react-native';

import { type Address, standing } from './scribe';
import { kindOf, kinds } from './kinds';
import { onVellum, type Palette } from './theme';
import type { List } from './types';
import type { ScrollWidgetProps } from './widgets/ScrollWidget';

const MAX_ITEMS = 9;

let lastPayload: string | null = null;

/** The widget shows the first scroll that still has something to do, or the first scroll at all. */
export const widgetProps = (lists: List[], palette: Palette, address: Address): ScrollWidgetProps => {
  const open = (list: List) => list.items.filter((item) => !item.section && !item.done);
  // What must not fail is shown before anything else while it has lines left.
  const pressing = lists.find((candidate) => kindOf(candidate) === 'spell' && open(candidate).length > 0);
  const list = pressing ?? lists.find((candidate) => open(candidate).length > 0) ?? lists[0];
  // The widget wears the scroll's kind: its ribbon's colour on the painted initial, and a dark kind's own vellum.
  const kind = list ? kinds[kindOf(list)] : kinds.decree;
  const dressed = onVellum(palette, kind.vellum);
  const items = list ? open(list) : [];
  const shown = items.slice(0, MAX_ITEMS);
  return {
    title: list?.name ?? '',
    items: shown.map((item) => item.text),
    ids: shown.map((item) => item.id),
    struck: [],
    remaining: items.length,
    note: list ? standing.done(address) : standing.blank(address),
    paper: dressed.paperFrom,
    paperTo: dressed.paperTo,
    desk: palette.desk,
    ink: dressed.ink,
    faded: dressed.inkFaded,
    accent: dressed.accent,
    initial: kind.vellum ? dressed.accent : (kind.ribbon ?? dressed.accent),
  };
};

/**
 * Pushes the current lists to the home screen widget and the Lock Screen one. Safe to call often:
 * it skips unchanged data.
 */
export const syncWidget = async (lists: List[], palette: Palette, address: Address): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  try {
    const props = widgetProps(lists, palette, address);
    const payload = JSON.stringify(props);
    if (payload === lastPayload) return;
    // Lazy imports keep the native module out of the web bundle.
    const { default: ScrollWidget } = await import('./widgets/ScrollWidget');
    ScrollWidget.updateTimeline([{ date: new Date(), props }]);
    lastPayload = payload;
    // The Lock Screen widget is newer than the home screen one; if it is missing from this build, the other still updates.
    try {
      const { default: LockWidget } = await import('./widgets/LockWidget');
      LockWidget.updateTimeline([{ date: new Date(), props: { title: props.title, items: props.items.slice(0, 2), remaining: props.remaining } }]);
    } catch {
      // Expected in a build made before the Lock Screen widget existed; nothing to report.
    }
  } catch (error) {
    // The widget is a convenience; it must never take the app down.
    console.warn('Widget sync failed:', error);
  }
};

/**
 * The ids of items struck on the widget since the app last looked. Reading them also makes the next
 * sync write the widget afresh, which empties its list of struck ids.
 */
export const takeWidgetStrikes = async (): Promise<string[]> => {
  if (Platform.OS !== 'ios') return [];
  try {
    const { default: ScrollWidget } = await import('./widgets/ScrollWidget');
    const timeline = await ScrollWidget.getTimeline();
    const struck = timeline[timeline.length - 1]?.props.struck ?? [];
    if (struck.length > 0) lastPayload = null;
    return struck.filter((id): id is string => typeof id === 'string');
  } catch {
    // The widget cannot be read in some builds; then nothing was struck on it.
    return [];
  }
};

/** Calls back when a button on the widget is pressed while the app is running. Returns a function that stops listening. */
export const listenForWidgetStrikes = (onPress: () => void): (() => void) => {
  if (Platform.OS !== 'ios') return () => undefined;
  let stop: (() => void) | undefined;
  let stopped = false;
  void import('expo-widgets')
    .then(({ addUserInteractionListener }) => {
      if (stopped) return;
      const subscription = addUserInteractionListener(() => onPress());
      stop = () => subscription.remove();
    })
    .catch(() => undefined);
  return () => {
    stopped = true;
    stop?.();
  };
};
