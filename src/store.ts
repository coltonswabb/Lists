import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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

const parseLists = (raw: string | null): List[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isList) : [];
  } catch {
    return [];
  }
};

/** Unfinished items stay on top in their order; finished ones sink below them. */
const sinkDone = (items: Item[]) => [...items.filter((i) => !i.done), ...items.filter((i) => i.done)];

export type AddPosition = 'top' | 'end';

export const useLists = () => {
  const [lists, setLists] = useState<List[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setLists(parseLists(raw)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists)).catch(() => undefined);
  }, [lists, loaded]);

  const updateItems = useCallback((listId: string, update: (items: Item[]) => Item[]) => {
    setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, items: update(l.items) } : l)));
  }, []);

  const addList = useCallback((name: string, at: AddPosition) => {
    const list: List = { id: newId(), name, items: [] };
    setLists((prev) => (at === 'top' ? [list, ...prev] : [...prev, list]));
  }, []);

  const renameList = useCallback((id: string, name: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const addItem = useCallback(
    (listId: string, text: string, at: AddPosition) => {
      const item: Item = { id: newId(), text, done: false };
      updateItems(listId, (items) => sinkDone(at === 'top' ? [item, ...items] : [...items, item]));
    },
    [updateItems],
  );

  const renameItem = useCallback(
    (listId: string, id: string, text: string) => {
      updateItems(listId, (items) => items.map((i) => (i.id === id ? { ...i, text } : i)));
    },
    [updateItems],
  );

  const toggleItem = useCallback(
    (listId: string, id: string) => {
      updateItems(listId, (items) => sinkDone(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i))));
    },
    [updateItems],
  );

  const deleteItem = useCallback(
    (listId: string, id: string) => {
      updateItems(listId, (items) => items.filter((i) => i.id !== id));
    },
    [updateItems],
  );

  return { lists, loaded, addList, renameList, deleteList, addItem, renameItem, toggleItem, deleteItem };
};
