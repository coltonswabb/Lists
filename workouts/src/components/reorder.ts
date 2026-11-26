import type { SharedValue } from 'react-native-reanimated';

/** Height of one row in the lineup shown while reordering. */
export const LINEUP_ROW = 60;

export const HOLD_TO_DRAG_MS = 320;

/** Drag state shared between the card being held and the lineup drawn over the screen. */
export type Reorder = {
  /** Index being dragged, or -1 when nothing is. */
  from: SharedValue<number>;
  /** Index it would land on if dropped now. */
  to: SharedValue<number>;
  dragY: SharedValue<number>;
};
