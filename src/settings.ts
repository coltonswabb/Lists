import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { setSoundEnabled } from './sounds';
import { isThemeName, type ThemeName, themeNames } from './theme';

const STORAGE_KEY = 'lists/settings/v1';

export const useSettings = () => {
  const [sound, setSound] = useState(true);
  const [theme, setTheme] = useState<ThemeName>('scriptorium');
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
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sound, theme })).catch(() => undefined);
  }, [loaded, sound, theme]);

  const toggleSound = useCallback(() => {
    setSound((on) => {
      setSoundEnabled(!on);
      return !on;
    });
  }, []);

  const nextTheme = useCallback(() => {
    setTheme((current) => themeNames[(themeNames.indexOf(current) + 1) % themeNames.length] ?? current);
  }, []);

  return { sound, toggleSound, theme, nextTheme };
};
