import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Item, List } from './types';

const STORAGE_KEY = 'lists/v1';

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
  return section ? { id: newId(), text, done: false, section: true } : { id: newId(), text, done: false };
};

/** Shown on first launch only: each item teaches the gesture it names. */
const starterLists = (): List[] => [
  {
    id: newId(),
    name: 'Read me first',
    items: [
      'Gestures:',
      'Swipe me right to complete',
      'Swipe me left to delete',
      'Tap me to rename',
      'Hold and drag me to reorder',
      'Adding:',
      'Pull down to add a row',
      'Pinch apart to add a row',
      'A colon at the end adds a section',
      'Pull far down to close the scroll',
    ].map(newItem),
  },
];

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

export type Undo = { label: string; lists: List[] };

export const useLists = () => {
  const [lists, setLists] = useState<List[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const current = useRef<List[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(parseLists)
      .catch((): List[] => [])
      .then((stored) => {
        current.current = stored;
        setLists(stored);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists)).catch(() => undefined);
  }, [lists, loaded]);

  /** Applies a change. Passing `undoLabel` makes the change undoable under that label. */
  const apply = useCallback((update: (lists: List[]) => List[], undoLabel?: string) => {
    const before = current.current;
    const after = update(before);
    current.current = after;
    setLists(after);
    if (undoLabel) setUndo({ label: undoLabel, lists: before });
  }, []);

  const applyToItems = useCallback(
    (listId: string, update: (items: Item[]) => Item[], undoLabel?: string) => {
      apply((all) => all.map((l) => (l.id === listId ? { ...l, items: update(l.items) } : l)), undoLabel);
    },
    [apply],
  );

  const undoLast = useCallback(() => {
    setUndo((pending) => {
      if (pending) {
        current.current = pending.lists;
        setLists(pending.lists);
      }
      return null;
    });
  }, []);

  const dismissUndo = useCallback(() => setUndo(null), []);

  const addLists = useCallback(
    (names: string[], index: number) => {
      apply((all) => insertAt(all, index, names.map((name) => ({ id: newId(), name, items: [] }))));
    },
    [apply],
  );

  const renameList = useCallback(
    (id: string, name: string) => apply((all) => all.map((l) => (l.id === id ? { ...l, name } : l))),
    [apply],
  );

  const deleteList = useCallback(
    (id: string) => {
      const name = current.current.find((l) => l.id === id)?.name ?? 'list';
      apply((all) => all.filter((l) => l.id !== id), `Struck “${name}”`);
    },
    [apply],
  );

  const moveList = useCallback((from: number, to: number) => apply((all) => move(all, from, to)), [apply]);

  const addItems = useCallback(
    (listId: string, texts: string[], index: number) => {
      applyToItems(listId, (items) => sinkDone(insertAt(items, index, texts.map(newItem))));
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
                ? { id, text: entry.text, done: false, section: true }
                : { id, text: entry.text, done: i.done },
          ),
        ),
      );
    },
    [applyToItems],
  );

  const toggleItem = useCallback(
    (listId: string, id: string) => {
      applyToItems(listId, (items) => sinkDone(items.map((i) => (i.id === id && !i.section ? { ...i, done: !i.done } : i))));
    },
    [applyToItems],
  );

  const deleteItem = useCallback(
    (listId: string, id: string) => {
      const items = current.current.find((l) => l.id === listId)?.items ?? [];
      const text = items.find((i) => i.id === id)?.text ?? 'item';
      applyToItems(listId, (all) => all.filter((i) => i.id !== id), `Struck “${text}”`);
    },
    [applyToItems],
  );

  const moveItem = useCallback(
    (listId: string, from: number, to: number) => applyToItems(listId, (items) => sinkDone(move(items, from, to))),
    [applyToItems],
  );

  const uncheckAll = useCallback(
    (listId: string) => {
      applyToItems(listId, (items) => items.map((i) => ({ ...i, done: false })), 'Unmarked every item');
    },
    [applyToItems],
  );

  const clearDone = useCallback(
    (listId: string) => {
      applyToItems(listId, (items) => items.filter((i) => !i.done), 'Cleared finished items');
    },
    [applyToItems],
  );

  return {
    lists,
    loaded,
    undo,
    undoLast,
    dismissUndo,
    addLists,
    renameList,
    deleteList,
    moveList,
    addItems,
    renameItem,
    toggleItem,
    deleteItem,
    moveItem,
    uncheckAll,
    clearDone,
  };
};
