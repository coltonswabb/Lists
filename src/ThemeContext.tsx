import { createContext, useContext, useMemo } from 'react';

import { type Palette, paletteOf } from './theme';

const ThemeContext = createContext<Palette>(paletteOf('scriptorium'));

export const ThemeProvider = ThemeContext.Provider;

/** The current palette alone, for components that build no styles from it. */
export const usePalette = (): Palette => useContext(ThemeContext);

/** The current palette, plus the caller's styles built from it. Styles are rebuilt only when the theme changes. */
export const useTheme = <T,>(makeStyles: (colors: Palette) => T): { colors: Palette; styles: T } => {
  const colors = useContext(ThemeContext);
  const styles = useMemo(() => makeStyles(colors), [makeStyles, colors]);
  return { colors, styles };
};
