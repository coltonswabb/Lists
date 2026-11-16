import { Platform } from 'react-native';

import type { ThemeName } from './theme';

/**
 * The home screen icon for each paper, as named in app.json's expo-alternate-app-icons entry.
 * Scriptorium is the app's own icon. The icons are drawn by scripts/draw-icons.py.
 */
const icons = {
  scriptorium: null,
  vigil: 'Vigil',
  lapis: 'Lapis',
  verdant: 'Verdant',
  codex: 'Codex',
} as const satisfies Record<ThemeName, string | null>;

/** Gives the app the icon of the chosen paper. iOS confirms the change with an alert of its own. */
export const matchIconTo = async (theme: ThemeName): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    // Loaded lazily, so a build without the native module (or the web) simply keeps its icon.
    const AppIcons = await import('expo-alternate-app-icons');
    if (!AppIcons.supportsAlternateIcons) return;
    const wanted = icons[theme];
    if (AppIcons.getAppIconName() === wanted) return;
    await AppIcons.setAlternateAppIcon(wanted);
  } catch (error) {
    // The icon is a flourish; failing to change it must never disturb choosing the paper.
    console.warn('App icon change failed:', error);
  }
};
