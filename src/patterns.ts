import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { readKept } from './storage';
import type { List } from './types';

const STORAGE_KEY = 'decree/patterns/v1';

/** One line of a pattern: an item's wording, or a heading. Nothing about whether it was ever done. */
export type PatternLine = { text: string; section?: boolean };

/** The shape of a scroll, kept so that a new scroll can be cut to it: its name, headings and items. */
export type Pattern = {
  id: string;
  name: string;
  lines: PatternLine[];
  /** The scroll renewed itself each dawn, and one cut to this pattern will too. */
  daily?: boolean;
};

const isLine = (value: unknown): value is PatternLine =>
  typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string';

const isPattern = (value: unknown): value is Pattern =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'lines' in value &&
  Array.isArray(value.lines) &&
  value.lines.every(isLine);

/** The patterns in something read from outside, such as a backup; anything that is not one is dropped. */
export const readPatterns = (value: unknown): Pattern[] => (Array.isArray(value) ? value.filter(isPattern) : []);

const parse = (raw: string | null): Pattern[] => {
  try {
    const stored: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(stored) ? stored.filter(isPattern) : [];
  } catch {
    return [];
  }
};

/** The patterns the scribe keeps, and the two things that can be done with them. */
export const usePatterns = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loaded, setLoaded] = useState(false);
  const unread = useRef(false);

  useEffect(() => {
    readKept(STORAGE_KEY)
      .then((kept) => {
        if (kept.failed) unread.current = true;
        else setPatterns(parse(kept.raw));
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    // Patterns that could not be read are still there: saving now would put nothing over them.
    if (!loaded || unread.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patterns)).catch(() => undefined);
  }, [loaded, patterns]);

  /** Keeps a scroll's shape under its name. Keeping one of the same name again replaces it. */
  const keep = useCallback((list: List) => {
    const pattern: Pattern = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      name: list.name,
      lines: list.items.map((item) => (item.section ? { text: item.text, section: true } : { text: item.text })),
      ...(list.daily ? { daily: true } : {}),
    };
    setPatterns((all) => [...all.filter((kept) => kept.name !== list.name), pattern]);
  }, []);

  const forget = useCallback((id: string) => setPatterns((all) => all.filter((pattern) => pattern.id !== id)), []);

  /** Puts a restored backup's patterns in place of the ones kept now. */
  const replace = useCallback((all: Pattern[]) => setPatterns(all), []);

  return { patterns, keep, forget, replace };
};
