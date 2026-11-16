import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  type Address,
  isAddress,
  isScribeMode,
  type ScribeMode,
  scribeModes,
  setScribeAddress,
  setScribeMode,
} from './scribe';
import { setSoundEnabled } from './sounds';
import { matchIconTo } from './appIcon';
import { isThemeName, type ThemeName } from './theme';

const STORAGE_KEY = 'lists/settings/v1';

/** The letter pressed into the wax seal, or null for the scribe's own seal. Read wherever a seal is drawn. */
let sealInitial: string | null = null;
export const getSealInitial = () => sealInitial;

export const useSettings = () => {
  const [sound, setSound] = useState(true);
  const [theme, setTheme] = useState<ThemeName>('scriptorium');
  /** The paper to come back to when Night Vigil is put out by the candle. */
  const [dayTheme, setDayTheme] = useState<ThemeName>('scriptorium');
  /** Null until the user has told the scribe how to address them. */
  const [address, setAddress] = useState<Address | null>(null);
  const [scribe, setScribe] = useState<ScribeMode>('chatty');
  /** The user's own letter for the wax seal, or null to keep the scribe's. */
  const [seal, setSeal] = useState<string | null>(null);
  /** Whether the home screen icon follows the paper. Off by default: iOS interrupts with an alert on every change. */
  const [matchIcon, setMatchIcon] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const stored: unknown = raw ? JSON.parse(raw) : null;
        const on = !(typeof stored === 'object' && stored !== null && 'sound' in stored && stored.sound === false);
        setSound(on);
        setSoundEnabled(on);
        if (typeof stored === 'object' && stored !== null && 'theme' in stored && isThemeName(stored.theme)) {
          setTheme(stored.theme);
        }
        if (typeof stored === 'object' && stored !== null && 'address' in stored && isAddress(stored.address)) {
          setAddress(stored.address);
          setScribeAddress(stored.address);
        }
        if (typeof stored === 'object' && stored !== null && 'dayTheme' in stored && isThemeName(stored.dayTheme)) {
          setDayTheme(stored.dayTheme);
        }
        if (typeof stored === 'object' && stored !== null && 'seal' in stored && typeof stored.seal === 'string' && stored.seal) {
          sealInitial = stored.seal;
          setSeal(stored.seal);
        }
        if (typeof stored === 'object' && stored !== null && 'matchIcon' in stored && stored.matchIcon === true) {
          setMatchIcon(true);
        }
        if (typeof stored === 'object' && stored !== null && 'scribe' in stored && isScribeMode(stored.scribe)) {
          setScribe(stored.scribe);
          setScribeMode(stored.scribe);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sound, theme, dayTheme, address, scribe, matchIcon, seal })).catch(() => undefined);
  }, [loaded, sound, theme, dayTheme, address, scribe, matchIcon, seal]);

  const toggleSound = useCallback(() => {
    setSound((on) => {
      setSoundEnabled(!on);
      return !on;
    });
  }, []);

  const chooseTheme = useCallback(
    (value: ThemeName) => {
      setTheme(value);
      if (value !== 'vigil') setDayTheme(value);
      if (matchIcon) void matchIconTo(value);
    },
    [matchIcon],
  );

  /** The candle's switch: into Night Vigil, or back out to the paper that was in use before it. */
  const toggleNight = useCallback(
    () => chooseTheme(theme === 'vigil' ? (dayTheme === 'vigil' ? 'scriptorium' : dayTheme) : 'vigil'),
    [chooseTheme, theme, dayTheme],
  );

  /** Turning it on gives the app the current paper's icon; turning it off returns the app's own. */
  const toggleMatchIcon = useCallback(() => {
    void matchIconTo(matchIcon ? 'scriptorium' : theme);
    setMatchIcon(!matchIcon);
  }, [matchIcon, theme]);

  /** Takes the first letter of what was typed for the seal; nothing typed gives the scribe's seal back. */
  const chooseSeal = useCallback((typed: string) => {
    const letter = [...typed.trim()].find((char) => /\p{L}/u.test(char))?.toUpperCase() ?? null;
    sealInitial = letter;
    setSeal(letter);
  }, []);

  const chooseAddress = useCallback((value: Address | null) => {
    if (value) setScribeAddress(value);
    setAddress(value);
  }, []);

  const nextScribeMode = useCallback(() => {
    setScribe((current) => {
      const next = scribeModes[(scribeModes.indexOf(current) + 1) % scribeModes.length] ?? current;
      setScribeMode(next);
      return next;
    });
  }, []);

  return { loaded, sound, toggleSound, theme, chooseTheme, toggleNight, seal, chooseSeal, matchIcon, toggleMatchIcon, address, chooseAddress, scribe, nextScribeMode };
};
