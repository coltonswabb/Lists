import { type FC, type ReactNode, useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { thud, tick } from '../haptics';
import { useTheme } from '../ThemeContext';
import { type Palette, ROW_HEIGHT } from '../theme';

const TRIGGER_DISTANCE = 84;
const TAP_SLOP = 8;
const HOLD_TO_DRAG_MS = 320;
const SPRING = { damping: 22, stiffness: 260 } as const;
const SHIFT = { duration: 150 } as const;
export const SWEEP_MS = 300;
/** Width of the margin mark and its padding: a tap here is reported separately from a tap on the text. */
const LEAD_ZONE = 62;
/** Holding a dragged row this close to the top or bottom of the screen scrolls the list. */
const EDGE = 96;
const NUDGE_EVERY_MS = 220;

/** Shared by every row of one list so rows can make room for the one being dragged. */
export type ReorderState = {
  /** Index of the row being dragged, or -1. */
  from: SharedValue<number>;
  /** Index it would land on if dropped now. */
  to: SharedValue<number>;
  /** How many rows travel together: 1, or a heading plus the rows under it. */
  span: SharedValue<number>;
  /** Finger travel since the drag began. */
  dragY: SharedValue<number>;
  /** Scroll offset when the drag began, so the rows stay under the finger while the list scrolls. */
  scrollStart: SharedValue<number>;
};

/** A gap opened by pinching: rows at or after `index` slide down by `size`. */
export type GapState = {
  index: SharedValue<number>;
  size: SharedValue<number>;
};

type SwipeRowProps = {
  /** Row background. */
  color: string;
  children: ReactNode;
  index: number;
  /** Number of rows in the list; a dragged row can land on any of them. */
  rowCount: number;
  draggable: boolean;
  /** Rows that move when this one is dragged: itself, plus the rows under it if it is a heading. */
  groupSize: number;
  reorder: ReorderState;
  gap: GapState;
  animateLayout: boolean;
  /** Set while finished rows are being cleared: the row starts sweeping off the sheet after this many milliseconds. */
  sweepAfter?: number;
  onDelete: () => void;
  /** Swipe right. Rows without it only rubber-band in that direction. */
  onComplete?: () => void;
  onPress: () => void;
  /** Tap on the margin mark, when that should do something other than `onPress`. */
  onPressLead?: () => void;
  /** Length of the line drawn through the text as the row is swiped towards complete; 0 for none. */
  strikeWidth?: number;
  /** The list's scroll offset, so a dragged row stays under the finger while the list scrolls. */
  scrollY: SharedValue<number>;
  /** Asked to scroll one step up (-1) or down (1) while a row is held at the edge of the screen. */
  onEdge: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDrop: (from: number, to: number) => void;
};

export const SwipeRow: FC<SwipeRowProps> = ({
  color,
  children,
  index,
  rowCount,
  draggable,
  groupSize,
  reorder,
  gap,
  animateLayout,
  sweepAfter,
  onDelete,
  onComplete,
  onPress,
  onPressLead,
  strikeWidth = 0,
  scrollY,
  onEdge,
  onDragStart,
  onDrop,
}) => {
  const { colors, styles } = useTheme(makeStyles);
  const { width, height } = useWindowDimensions();
  const offsetX = useSharedValue(0);
  const armed = useSharedValue(0);
  const { dragY, scrollStart } = reorder;
  const lastNudge = useSharedValue(0);
  const lift = useSharedValue(0);
  const canComplete = onComplete !== undefined;

  // Being cleared: the whole row sweeps off the sheet. Its owner removes it once the sweep has finished.
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (sweepAfter !== undefined) sweep.value = withDelay(sweepAfter, withTiming(1, { duration: SWEEP_MS }));
  }, [sweepAfter, sweep]);

  const complete = () => {
    thud();
    onComplete?.();
  };

  const swipe = usePanGesture({
    maxPointers: 1,
    activeOffsetX: [-14, 14],
    failOffsetY: [-10, 10],
    onUpdate: (event) => {
      'worklet';
      const x = event.translationX;
      offsetX.value = x > 0 && !canComplete ? x * 0.2 : x;
      const next = x < -TRIGGER_DISTANCE ? -1 : x > TRIGGER_DISTANCE && canComplete ? 1 : 0;
      if (next !== armed.value) {
        armed.value = next;
        if (next !== 0) scheduleOnRN(tick);
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const direction = event.canceled ? 0 : armed.value;
      armed.value = 0;
      if (direction === -1) {
        offsetX.value = withTiming(-width, { duration: 160 }, (finished) => {
          if (finished) scheduleOnRN(onDelete);
        });
        return;
      }
      offsetX.value = withSpring(0, SPRING);
      if (direction === 1) scheduleOnRN(complete);
    },
  });

  const drag = usePanGesture({
    enabled: draggable && rowCount > 1,
    maxPointers: 1,
    activateAfterLongPress: HOLD_TO_DRAG_MS,
    onActivate: () => {
      'worklet';
      dragY.value = 0;
      scrollStart.value = scrollY.value;
      reorder.from.value = index;
      reorder.to.value = index;
      reorder.span.value = groupSize;
      lift.value = withTiming(1, { duration: 120 });
      scheduleOnRN(onDragStart);
    },
    onUpdate: (event) => {
      'worklet';
      if (reorder.from.value !== index) return;
      dragY.value = event.translationY;
      const travelled = event.translationY + scrollY.value - scrollStart.value;
      const target = Math.round(index + travelled / ROW_HEIGHT);
      const edge = event.absoluteY > height - EDGE ? 1 : event.absoluteY < EDGE * 1.6 ? -1 : 0;
      const now = Date.now();
      if (edge !== 0 && now - lastNudge.value > NUDGE_EVERY_MS) {
        lastNudge.value = now;
        scheduleOnRN(onEdge, edge);
      }
      const to = Math.max(0, Math.min(rowCount - groupSize, target));
      if (to !== reorder.to.value) {
        reorder.to.value = to;
        scheduleOnRN(tick);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (reorder.from.value !== index) return;
      const to = reorder.to.value;
      lift.value = withTiming(0, { duration: 120 });
      const scrolled = scrollY.value - scrollStart.value;
      dragY.value = withTiming((to - index) * ROW_HEIGHT - scrolled, { duration: 120 }, () => {
        // A group moving down lands after the row its last member has passed.
        scheduleOnRN(onDrop, index, to > index ? Math.min(rowCount - 1, to + groupSize - 1) : to);
      });
    },
  });

  // Tap is a gesture (not a Pressable) so a swipe, drag or pull can never also fire a press.
  const tap = useTapGesture({
    maxDistance: TAP_SLOP,
    maxDuration: HOLD_TO_DRAG_MS,
    onActivate: (event) => {
      'worklet';
      if (onPressLead && event.x < LEAD_ZONE) scheduleOnRN(onPressLead);
      else scheduleOnRN(onPress);
    },
  });

  const gesture = useCompetingGestures(swipe, drag, tap);

  const containerStyle = useAnimatedStyle(() => {
    const from = reorder.from.value;
    const to = reorder.to.value;
    const span = reorder.span.value;
    const isDragged = from >= 0 && index >= from && index < from + span;
    const gapShift = gap.index.value >= 0 && index >= gap.index.value ? gap.size.value : 0;
    // While another row is dragged, rows between its origin and its target step aside.
    const aside =
      from < 0 || isDragged ? 0 : index >= from + span && index <= to + span - 1 ? -span : to <= index && index < from ? span : 0;
    const dragShift = isDragged ? dragY.value + scrollY.value - scrollStart.value : from < 0 ? 0 : withTiming(aside * ROW_HEIGHT, SHIFT);
    return {
      zIndex: isDragged ? 10 : 0,
      transform: [{ translateX: sweep.value * width }, { translateY: gapShift }, { translateY: dragShift }, { scale: 1 + (from === index ? lift.value * 0.03 : 0) }],
      shadowOpacity: lift.value * 0.35,
      opacity: 1 - sweep.value * 0.6,
    };
  });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offsetX.value }] }));
  // The strike is drawn left to right as the swipe approaches the point of completing.
  const strikeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(offsetX.value, [0, TRIGGER_DISTANCE], [0, 1], 'clamp') }],
  }));
  const completeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetX.value, [0, TRIGGER_DISTANCE], [0, 1], 'clamp'),
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetX.value, [-TRIGGER_DISTANCE, 0], [1, 0], 'clamp'),
  }));

  return (
    <Animated.View
      layout={animateLayout ? LinearTransition.duration(260) : undefined}
      style={[styles.container, containerStyle]}
    >
      <Animated.View style={[styles.action, styles.complete, completeStyle]}>
        <Text style={styles.glyph}>✓</Text>
      </Animated.View>
      <Animated.View style={[styles.action, styles.remove, deleteStyle]}>
        <Text style={styles.glyph}>✕</Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.row, { backgroundColor: color }, rowStyle]}>
          {children}
          {strikeWidth > 0 ? (
            <Animated.View pointerEvents="none" style={[styles.strike, { width: strikeWidth }, strikeStyle]} />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    height: ROW_HEIGHT,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
  },
  action: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: 24 },
  complete: { backgroundColor: colors.complete, alignItems: 'flex-start' },
  remove: { backgroundColor: colors.remove, alignItems: 'flex-end' },
  strike: { position: 'absolute', left: LEAD_ZONE, height: 2, backgroundColor: colors.accent, transformOrigin: 'left' },
  glyph: { color: colors.onAction, fontSize: 24, fontWeight: '700' },
});
