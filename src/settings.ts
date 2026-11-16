import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { type Address, isAddress, setScribeAddress } from './scribe';
import { setSoundEnabled } from './sounds';
import { isThemeName, type ThemeName, themeNames } from './theme';

const STORAGE_KEY = 'lists/settings/v1';

export const useSettings = () => {
  const [sound, setSound] = useState(true);
  const [theme, setTheme] = useState<ThemeName>('scriptorium');
  /** Null until the user has told the scribe how to address them. */
  const [address, setAddress] = useState<Address | null>(null);
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
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sound, theme, address })).catch(() => undefined);
  }, [loaded, sound, theme, address]);

  const toggleSound = useCallback(() => {
    setSound((on) => {
      setSoundEnabled(!on);
      return !on;
    });
  }, []);

  const nextTheme = useCallback(() => {
    setTheme((current) => themeNames[(themeNames.indexOf(current) + 1) % themeNames.length] ?? current);
  }, []);

  const chooseAddress = useCallback((value: Address | null) => {
    if (value) setScribeAddress(value);
    setAddress(value);
  }, []);

  return { loaded, sound, toggleSound, theme, nextTheme, address, chooseAddress };
};
