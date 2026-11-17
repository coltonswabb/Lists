import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { capitalize, describeDay } from './calendar';
import { parseReminder } from './reminder';
import type { ChronicleEntry, Item, List, SealedList } from './types';

const STORAGE_KEY = 'lists/v1';
const CHRONICLE_KEY = 'decree/chronicle/v1';
/** The chronicle keeps this many entries; older ones fall away. */
const CHRONICLE_LENGTH = 1000;
/** Daily scrolls are renewed from this hour, so a late night still counts as the day before. */
const DAWN_HOUR = 4;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const isItem = (value: unknown): value is Item =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'text' in value &&
  typeof value.text === 'string' &&
  'done' in value &&
  typeof value.done === 'boolean';

const isList = (value: unknown): value is List =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'items' in value &&
  Array.isArray(value.items) &&
  value.items.every(isItem);

/** "Produce:" or "# Produce" names a section; anything else is an ordinary item. */
const parseEntry = (raw: string): { text: string; section: boolean } => {
  const text = raw.trim();
  if (text.startsWith('#')) return { text: text.replace(/^#+\s*/, ''), section: true };
  if (text.length > 1 && text.endsWith(':')) return { text: text.slice(0, -1).trim(), section: true };
  return { text, section: false };
};

const newItem = (raw: string): Item => {
  const { text, section } = parseEntry(raw);
  if (section) return { id: newId(), text, done: false, section: true };
  const reminder = parseReminder(text);
  return { id: newId(), text: reminder.text, done: false, remindAt: reminder.remindAt, repeat: reminder.repeat };
};

/**
 * Shown on first launch only: the scribe's own first decree, each line teaching the gesture it names.
 * Lines stay under about 30 characters so none is cut short on a phone.
 */
const starterLists = (): List[] => [
  {
    id: newId(),
    name: 'Thy first decree',
    items: [
      'Striking:',
      'Swipe right to strike it done',
      'Swipe left to cast it out',
      'Tap to amend the wording',
      'Hold, then drag to reorder',
      'Tap its numeral to move it',
      'Writing:',
      'Pull down to pen a new line',
      'Pinch apart to write between',
      'End with a colon for a heading',
      'Write “@ 5pm” to be reminded',
      'Pull far down to roll me up',
      // Back in the Library, where the scribe's things stand.
      'On the desk:',
      'Tap the inkwell for a scroll',
      'Touch the candle for night',
    ].map(newItem),
  },
];

const isSealed = (value: unknown): value is SealedList =>
  isList(value) && 'sealedAt' in value && typeof value.sealedAt === 'number';

const isEntry = (value: unknown): value is ChronicleEntry =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'at' in value &&
  typeof value.at === 'number' &&
  'kind' in value &&
  (value.kind === 'done' || value.kind === 'sealed') &&
  'text' in value &&
  typeof value.text === 'string' &&
  'scroll' in value &&
  typeof value.scroll === 'string';

type Chronicle = { entries: ChronicleEntry[]; sealed: SealedList[] };

const parseChronicle = (raw: string | null): Chronicle => {
  try {
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { entries: [], sealed: [] };
    const entries = 'entries' in parsed && Array.isArray(parsed.entries) ? parsed.entries.filter(isEntry) : [];
    const sealed = 'sealed' in parsed && Array.isArray(parsed.sealed) ? parsed.sealed.filter(isSealed) : [];
    return { entries, sealed };
  } catch {
    return { entries: [], sealed: [] };
  }
};

/** The local calendar day, as YYYY-MM-DD. */
const dayOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The day a daily scroll should last have been renewed: today once dawn has passed, else yesterday. */
const renewalDay = (now: Date) =>
  dayOf(now.getHours() >= DAWN_HOUR ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

const dateOf = (day: string) => {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};
const dayAfter = (day: string) => {
  const date = dateOf(day);
  return dayOf(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
};

/** The day now being planned for by candlelight: the one that begins at the next dawn. */
export const plannedDay = (now: Date) => dayAfter(renewalDay(now));

/** The day it is, counted from dawn rather than midnight: before dawn it is still yesterday. */
export const dawnDay = (now: Date) => renewalDay(now);

/**
 * What dawn does. Every daily scroll whose day has turned is renewed: all its items are unmarked.
 * And if the Tomorrow scroll's day has come, what was planned on it is laid on the shelf as a
 * scroll named for the day, and Tomorrow is left blank for the next night.
 */
const renewDue = (lists: List[], now = new Date()): List[] => {
  const day = renewalDay(now);
  let laid: List | undefined;
  const kept = lists.map((list) => {
    if (list.tomorrow) {
      if (list.plannedFor && list.plannedFor > day) return list;
      if (list.items.length > 0) {
        laid = {
          id: newId(),
          name: capitalize(describeDay(dateOf(day))),
          items: list.items.map((item) => (item.done ? { ...item, done: false } : item)),
          touchedAt: now.getTime(),
        };
      }
      return { ...list, items: [], plannedFor: dayAfter(day) };
    }
    return list.daily && list.renewedOn !== day
      ? { ...list, renewedOn: day, items: list.items.map((item) => (item.done ? { ...item, done: false } : item)) }
      : list;
  });
  return laid ? [laid, ...kept] : kept;
};

/**
 * Takes back the chronicle's line for each of these items, where it was written today: unmarking
 * the same day is a correction. An older line stands, since the thing was done and the item is
 * only being used again.
 */
const takeBack = (entries: ChronicleEntry[], itemIds: string[], now = new Date()): ChronicleEntry[] => {
  const today = dayOf(now);
  const drop = new Set<number>();
  for (const id of itemIds) {
    const last = entries.findLastIndex((entry) => entry.itemId === id);
    const entry = entries[last];
    if (entry && dayOf(new Date(entry.at)) === today) drop.add(last);
  }
  return drop.size === 0 ? entries : entries.filter((_, index) => !drop.has(index));
};

const BACKUP_APP = 'decree';
const BACKUP_VERSION = 1;

/** Everything the scribe keeps, as one JSON document that `readBackup` can take back. */
export const writeBackup = (state: { lists: List[] } & Chronicle & { patterns?: unknown }): string =>
  JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, savedAt: new Date().toISOString(), ...state },
    null,
    2,
  );

/** A backup's contents, or null if the text is not a Decree backup. */
export const readBackup = (text: string): ({ lists: List[] } & Chronicle & { patterns: unknown }) | null => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!('app' in parsed) || parsed.app !== BACKUP_APP || !('lists' in parsed) || !Array.isArray(parsed.lists)) return null;
    const { entries, sealed } = parseChronicle(JSON.stringify(parsed));
    // Patterns are kept apart from the scrolls; they are handed back as found, for their own keeper to read.
    return { lists: parsed.lists.filter(isList), entries, sealed, patterns: 'patterns' in parsed ? parsed.patterns : [] };
  } catch {
    return null;
  }
};

const parseLists = (raw: string | null): List[] => {
  if (raw === null) return starterLists();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isList) : [];
  } catch {
    return [];
  }
};

/** Within each section, unfinished items stay on top in their order and finished ones sink below them. */
const sinkDone = (items: Item[]): Item[] => {
  const groups: Item[][] = [[]];
  for (const item of items) {
    if (item.section) groups.push([item]);
    else groups[groups.length - 1]?.push(item);
  }
  return groups.flatMap((group) => [
    ...group.filter((i) => i.section),
    ...group.filter((i) => !i.section && !i.done),
    ...group.filter((i) => !i.section && i.done),
  ]);
};

const insertAt = <T,>(array: T[], index: number, added: T[]): T[] => {
  const at = Math.max(0, Math.min(index, array.length));
  return [...array.slice(0, at), ...added, ...array.slice(at)];
};

const move = <T,>(array: T[], from: number, to: number): T[] => {
  const moved = array[from];
  if (moved === undefined) return array;
  const rest = array.filter((_, index) => index !== from);
  return insertAt(rest, to, [moved]);
};

/** The index of the heading that governs the row at `index`, or -1 above the first heading. */
const sectionOf = (items: Item[], index: number): number => {
  for (let i = Math.min(index, items.length - 1); i >= 0; i -= 1) if (items[i]?.section) return i;
  return -1;
};

/** Unfolds the section a row sits in, so a row that was just added or moved there stays visible. */
const reveal = (items: Item[], id: string): Item[] => {
  const heading = sectionOf(items, items.findIndex((i) => i.id === id));
  return items.map((item, index) => (index === heading && item.collapsed ? { ...item, collapsed: false } : item));
};

/**
 * Moves one row as `move` does, except that a heading takes its items with it and lands on a
 * section boundary, so it can never split another section.
 */
const moveRow = (items: Item[], from: number, to: number): Item[] => {
  const moved = items[from];
  const target = items[to];
  if (!moved || !target || from === to) return items;
  if (!moved.section) return reveal(move(items, from, to), moved.id);
  let end = from + 1;
  while (end < items.length && !items[end]?.section) end += 1;
  if (to > from && to < end) return items;
  const group = items.slice(from, end);
  const rest = [...items.slice(0, from), ...items.slice(end)];
  let at = rest.indexOf(target) + (to > from ? 1 : 0);
  if (to > from) while (at < rest.length && !rest[at]?.section) at += 1;
  else while (at > 0 && !rest[at]?.section) at -= 1;
  return insertAt(rest, at, group);
};

type Kept = { lists: List[] } & Chronicle;

export type Undo = { label: string; before: Kept };

export const useLists = () => {
  const [kept, setKept] = useState<Kept>({ lists: [], entries: [], sealed: [] });
  const [loaded, setLoaded] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const current = useRef<Kept>(kept);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY)
        .then(parseLists)
        .catch((): List[] => []),
      AsyncStorage.getItem(CHRONICLE_KEY)
        .then(parseChronicle)
        .catch((): Chronicle => ({ entries: [], sealed: [] })),
    ]).then(([lists, chronicle]) => {
      const stored = { lists: renewDue(lists), ...chronicle };
      current.current = stored;
      setKept(stored);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept.lists)).catch(() => undefined);
  }, [kept.lists, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(CHRONICLE_KEY, JSON.stringify({ entries: kept.entries, sealed: kept.sealed })).catch(
      () => undefined,
    );
  }, [kept.entries, kept.sealed, loaded]);

  /** Applies a change to everything kept. Passing `undoLabel` makes the change undoable under that label. */
  const applyAll = useCallback((update: (kept: Kept) => Kept, undoLabel?: string) => {
    const before = current.current;
    const after = update(before);
    if (after === before) return;
    current.current = after;
    setKept(after);
    if (undoLabel) setUndo({ label: undoLabel, before });
  }, []);

  const apply = useCallback(
    (update: (lists: List[]) => List[], undoLabel?: string) =>
      applyAll((all) => ({ ...all, lists: update(all.lists) }), undoLabel),
    [applyAll],
  );

  const applyToItems = useCallback(
    (listId: string, update: (items: Item[]) => Item[], undoLabel?: string) => {
      apply(
        (all) => all.map((l) => (l.id === listId ? { ...l, items: update(l.items), touchedAt: Date.now() } : l)),
        undoLabel,
      );
    },
    [apply],
  );

  const undoLast = useCallback(() => {
    setUndo((pending) => {
      if (pending) {
        current.current = pending.before;
        setKept(pending.before);
      }
      return null;
    });
  }, []);

  const dismissUndo = useCallback(() => setUndo(null), []);

  /**
   * Does what dawn does, if dawn has passed since it was last done. Called when the app comes back
   * to the front. Says what happened, so the scribe can mention it: last night's plans were laid
   * out, or daily scrolls were renewed, or nothing.
   */
  const renew = useCallback((): 'planned' | 'renewed' | null => {
    const before = current.current;
    applyAll((all) => {
      const lists = renewDue(all.lists);
      const changed = lists.length !== all.lists.length || lists.some((list, index) => list !== all.lists[index]);
      return changed ? { ...all, lists } : all;
    });
    if (current.current === before) return null;
    return current.current.lists.length > before.lists.length ? 'planned' : 'renewed';
  }, [applyAll]);

  /** Makes sure there is a Tomorrow scroll to write on. It lies off the shelf, after the others. */
  const ensureTomorrow = useCallback(() => {
    apply((all) =>
      all.some((list) => list.tomorrow)
        ? all
        : [...all, { id: newId(), name: 'Tomorrow', items: [], tomorrow: true, plannedFor: plannedDay(new Date()) }],
    );
  }, [apply]);

  const addLists = useCallback(
    (names: string[], index: number, plannedFor?: string) => {
      apply((all) =>
        insertAt(
          all,
          index,
          names.map((name) => ({ id: newId(), name, items: [], touchedAt: Date.now(), ...(plannedFor ? { plannedFor } : {}) })),
        ),
      );
    },
    [apply],
  );

  /** Lays a new scroll at the end of the shelf, already written with the given lines, none of them done. */
  const addListFrom = useCallback(
    (name: string, lines: { text: string; section?: boolean }[], daily = false) => {
      const items: Item[] = lines.map((line) =>
        line.section ? { id: newId(), text: line.text, done: false, section: true } : { id: newId(), text: line.text, done: false },
      );
      const renewal = daily ? { daily: true, renewedOn: renewalDay(new Date()) } : {};
      apply((all) => [...all, { id: newId(), name, items, touchedAt: Date.now(), ...renewal }]);
    },
    [apply],
  );

  const renameList = useCallback(
    (id: string, name: string) => apply((all) => all.map((l) => (l.id === id ? { ...l, name } : l))),
    [apply],
  );

  const deleteList = useCallback(
    (id: string) => {
      const name = current.current.lists.find((l) => l.id === id)?.name ?? 'list';
      apply((all) => all.filter((l) => l.id !== id), `Cast out “${name}”`);
    },
    [apply],
  );

  const moveList = useCallback((from: number, to: number) => apply((all) => move(all, from, to)), [apply]);

  /** Takes a scroll off the shelf and keeps it, sealed, in the chronicle. */
  const sealList = useCallback(
    (id: string) => {
      const list = current.current.lists.find((l) => l.id === id);
      if (!list) return;
      const now = Date.now();
      applyAll(
        (all) => ({
          lists: all.lists.filter((l) => l.id !== id),
          sealed: [{ ...list, sealedAt: now }, ...all.sealed],
          entries: [...all.entries, { id: newId(), at: now, kind: 'sealed' as const, text: list.name, scroll: list.name }].slice(
            -CHRONICLE_LENGTH,
          ),
        }),
        `Sealed “${list.name}”`,
      );
    },
    [applyAll],
  );

  /** Breaks a scroll's seal and puts it back at the top of the shelf. */
  const unsealList = useCallback(
    (id: string) => {
      applyAll((all) => {
        const found = all.sealed.find((l) => l.id === id);
        if (!found) return all;
        const { sealedAt: _sealedAt, ...list } = found;
        return { ...all, sealed: all.sealed.filter((l) => l.id !== id), lists: [{ ...list, touchedAt: Date.now() }, ...all.lists] };
      });
    },
    [applyAll],
  );

  /** Destroys a sealed scroll for good. Its lines in the chronicle remain. */
  const burnSealed = useCallback(
    (id: string) => {
      const name = current.current.sealed.find((l) => l.id === id)?.name ?? 'scroll';
      applyAll((all) => ({ ...all, sealed: all.sealed.filter((l) => l.id !== id) }), `Burned “${name}”`);
    },
    [applyAll],
  );

  const addItems = useCallback(
    (listId: string, texts: string[], index: number, plannedFor?: string) => {
      const added = texts.map(newItem).map((item) => (plannedFor && !item.section ? { ...item, plannedFor } : item));
      const first = added[0];
      if (!first) return;
      applyToItems(listId, (items) => sinkDone(reveal(insertAt(items, index, added), first.id)));
    },
    [applyToItems],
  );

  const renameItem = useCallback(
    (listId: string, id: string, text: string) => {
      // Renaming goes through the same parser, so adding or removing the colon turns an item into a section or back.
      const entry = parseEntry(text);
      applyToItems(listId, (items) =>
        sinkDone(
          items.map((i) =>
            i.id !== id
              ? i
              : entry.section
                ? { id, text: entry.text, done: false, section: true, collapsed: i.collapsed }
                : { id, done: i.done, ...parseReminder(entry.text) },
          ),
        ),
      );
    },
    [applyToItems],
  );

  /** Puts an item's reminder off until the given moment, as when "later" is pressed on the reminder itself. */
  const remindLater = useCallback(
    (listId: string, id: string, at: number) =>
      applyToItems(listId, (items) => items.map((i) => (i.id === id && !i.section ? { ...i, remindAt: at } : i))),
    [applyToItems],
  );

  /** Marks an item done or not. Marking it done writes a line in the chronicle; unmarking the same day takes the line back. */
  const toggleItem = useCallback(
    (listId: string, id: string) => {
      applyAll((all) => {
        const list = all.lists.find((l) => l.id === listId);
        const item = list?.items.find((i) => i.id === id);
        if (!list || !item || item.section) return all;
        const lists = all.lists.map((l) =>
          l.id === listId
            ? { ...l, items: sinkDone(l.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i))), touchedAt: Date.now() }
            : l,
        );
        let entries: ChronicleEntry[];
        if (item.done) {
          entries = takeBack(all.entries, [id]);
        } else {
          entries = [
            ...all.entries,
            { id: newId(), at: Date.now(), kind: 'done' as const, text: item.text, scroll: list.name, itemId: id },
          ].slice(-CHRONICLE_LENGTH);
        }
        return { ...all, lists, entries };
      });
    },
    [applyAll],
  );

  const deleteItem = useCallback(
    (listId: string, id: string) => {
      const items = current.current.lists.find((l) => l.id === listId)?.items ?? [];
      const text = items.find((i) => i.id === id)?.text ?? 'item';
      applyToItems(listId, (all) => all.filter((i) => i.id !== id), `Cast out “${text}”`);
    },
    [applyToItems],
  );

  const moveItem = useCallback(
    (listId: string, from: number, to: number) => applyToItems(listId, (items) => sinkDone(moveRow(items, from, to))),
    [applyToItems],
  );

  /** Carries an item to the top of another scroll. */
  const sendItem = useCallback(
    (fromListId: string, id: string, toListId: string) => {
      const item = current.current.lists.find((l) => l.id === fromListId)?.items.find((i) => i.id === id);
      if (!item || item.section || fromListId === toListId) return;
      const now = Date.now();
      apply(
        (all) =>
          all.map((l) =>
            l.id === fromListId
              ? { ...l, items: l.items.filter((i) => i.id !== id), touchedAt: now }
              : l.id === toListId
                ? { ...l, items: sinkDone([item, ...l.items]), touchedAt: now }
                : l,
          ),
        `Moved “${item.text}”`,
      );
    },
    [apply],
  );

  const toggleSection = useCallback(
    (listId: string, id: string) => {
      applyToItems(listId, (items) =>
        items.map((i) => (i.id === id && i.section ? { ...i, collapsed: !i.collapsed } : i)),
      );
    },
    [applyToItems],
  );

  const uncheckAll = useCallback(
    (listId: string) => {
      applyAll((all) => {
        const list = all.lists.find((l) => l.id === listId);
        if (!list) return all;
        const struck = list.items.filter((i) => i.done).map((i) => i.id);
        const lists = all.lists.map((l) =>
          l.id === listId ? { ...l, items: l.items.map((i) => ({ ...i, done: false })), touchedAt: Date.now() } : l,
        );
        return { ...all, lists, entries: takeBack(all.entries, struck) };
      }, 'Unmarked every item');
    },
    [applyAll],
  );

  /** Makes a scroll renew itself each dawn, or stop doing so. */
  const setDaily = useCallback(
    (listId: string, daily: boolean) => {
      const day = renewalDay(new Date());
      apply((all) => all.map((l) => (l.id === listId ? { ...l, daily, renewedOn: daily ? day : undefined } : l)));
    },
    [apply],
  );

  const clearDone = useCallback(
    (listId: string) => {
      // A section whose every item was finished has served its purpose and goes with them.
      applyToItems(
        listId,
        (items) =>
          items.filter((item, index) => {
            if (!item.section) return !item.done;
            let end = index + 1;
            while (end < items.length && !items[end]?.section) end += 1;
            const own = items.slice(index + 1, end);
            return own.length === 0 || own.some((i) => !i.done);
          }),
        'Cleared finished items',
      );
    },
    [applyToItems],
  );

  /** Everything kept, as a backup document. */
  const backup = useCallback((patterns?: unknown) => writeBackup({ ...current.current, patterns }), []);

  /** Replaces everything with a backup's contents. Undoable, in case the wrong file was chosen. */
  const restore = useCallback(
    (contents: Kept) =>
      applyAll(
        () => ({ lists: renewDue(contents.lists), entries: contents.entries, sealed: contents.sealed }),
        'Restored from the backup',
      ),
    [applyAll],
  );

  return {
    lists: kept.lists,
    entries: kept.entries,
    sealed: kept.sealed,
    loaded,
    undo,
    undoLast,
    dismissUndo,
    renew,
    addLists,
    ensureTomorrow,
    addListFrom,
    remindLater,
    renameList,
    deleteList,
    moveList,
    sealList,
    unsealList,
    burnSealed,
    addItems,
    renameItem,
    toggleItem,
    deleteItem,
    moveItem,
    sendItem,
    toggleSection,
    uncheckAll,
    setDaily,
    clearDone,
    backup,
    restore,
  };
};
