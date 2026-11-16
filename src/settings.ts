import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { setSoundEnabled } from './sounds';

const STORAGE_KEY = 'lists/settings/v1';

export const useSettings = () => {
  const [sound, setSound] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const stored: unknown = raw ? JSON.parse(raw) : null;
        const on = !(typeof stored === 'object' && stored !== null && 'sound' in stored && stored.sound === false);
        setSound(on);
        setSoundEnabled(on);
      })
      .catch(() => undefined);
  }, []);

  const toggleSound = useCallback(() => {
    setSound((on) => {
      setSoundEnabled(!on);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sound: !on })).catch(() => undefined);
      return !on;
    });
  }, []);

  return { sound, toggleSound };
};
