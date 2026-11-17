import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * How wide the pane a screen is drawn in is, when that is not the whole window: on a wide screen the shelf
 * and the open scroll lie side by side, each in a pane of its own.
 */
export const PaneWidth = createContext<number | null>(null);

/** The width there is to draw in: the pane's, or the window's where there are no panes. */
export const usePaneWidth = () => {
  const pane = useContext(PaneWidth);
  const { width } = useWindowDimensions();
  return pane ?? width;
};
