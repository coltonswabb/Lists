import type { FC, ReactNode } from 'react';
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { thud, tick } from '../haptics';
import { colors, ROW_HEIGHT } from '../theme';

const TRIGGER_DISTANCE = 84;
const TAP_SLOP = 8;
const HOLD_TO_DRAG_MS = 320;
const SPRING = { damping: 22, stiffness: 260 } as const;
const SHIFT = { duration: 150 } as const;

/** Shared by every row of one list so rows can make room for the one being dragged. */
export type ReorderState = {
  /** Index of the row being dragged, or -1. */
  from: SharedValue<number>;
  /** Index it would land on if dropped now. */
  to: SharedValue<number>;
};

/** A gap opened by pinching: rows at or after `index` slide down by `size`. */
export type GapState = {
  index: SharedValue<number>;
  size: SharedValue<number>;
};

type SwipeRowProps = {
  color: string;
  children: ReactNode;
  index: number;
  /** Rows with an index below this can be dragged, and only among themselves. */
  reorderLimit: number;
  reorder: ReorderState;
  gap: GapState;
  animateLayout: boolean;
  onDelete: () => void;
  /** Swipe right. Rows without it only rubber-band in that direction. */
  onComplete?: () => void;
  onPress: () => void;
  onDragStart: () => void;
  onDrop: (from: number, to: number) => void;
};

export const SwipeRow: FC<SwipeRowProps> = ({
  color,
  children,
  index,
  reorderLimit,
  reorder,
  gap,
  animateLayout,
  onDelete,
  onComplete,
  onPress,
  onDragStart,
  onDrop,
}) => {
  const { width } = useWindowDimensions();
  const offsetX = useSharedValue(0);
  const armed = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lift = useSharedValue(0);
  const canComplete = onComplete !== undefined;

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
    enabled: index < reorderLimit && reorderLimit > 1,
    maxPointers: 1,
    activateAfterLongPress: HOLD_TO_DRAG_MS,
    onActivate: () => {
      'worklet';
      dragY.value = 0;
      reorder.from.value = index;
      reorder.to.value = index;
      lift.value = withTiming(1, { duration: 120 });
      scheduleOnRN(onDragStart);
    },
    onUpdate: (event) => {
      'worklet';
      if (reorder.from.value !== index) return;
      dragY.value = event.translationY;
      const target = Math.round(index + event.translationY / ROW_HEIGHT);
      const to = Math.max(0, Math.min(reorderLimit - 1, target));
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
      dragY.value = withTiming((to - index) * ROW_HEIGHT, { duration: 120 }, () => {
        scheduleOnRN(onDrop, index, to);
      });
    },
  });

  // Tap is a gesture (not a Pressable) so a swipe, drag or pull can never also fire a press.
  const tap = useTapGesture({
    maxDistance: TAP_SLOP,
    maxDuration: HOLD_TO_DRAG_MS,
    onActivate: () => {
      'worklet';
      scheduleOnRN(onPress);
    },
  });

  const gesture = useCompetingGestures(swipe, drag, tap);

  const containerStyle = useAnimatedStyle(() => {
    const from = reorder.from.value;
    const to = reorder.to.value;
    const isDragged = from === index;
    const gapShift = gap.index.value >= 0 && index >= gap.index.value ? gap.size.value : 0;
    // While another row is dragged, rows between its origin and its target step aside.
    const aside = from < 0 || isDragged ? 0 : from < index && index <= to ? -1 : to <= index && index < from ? 1 : 0;
    const dragShift = isDragged ? dragY.value : from < 0 ? 0 : withTiming(aside * ROW_HEIGHT, SHIFT);
    return {
      zIndex: isDragged ? 10 : 0,
      transform: [{ translateY: gapShift }, { translateY: dragShift }, { scale: 1 + lift.value * 0.03 }],
      shadowOpacity: lift.value * 0.35,
    };
  });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offsetX.value }] }));
  const completeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetX.value, [0, TRIGGER_DISTANCE], [0, 1], 'clamp'),
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetX.value, [-TRIGGER_DISTANCE, 0], [1, 0], 'clamp'),
  }));

  return (
    <Animated.View
      layout={animateLayout ? LinearTransition.duration(220) : undefined}
      style={[styles.container, containerStyle]}
    >
      <Animated.View style={[styles.action, styles.complete, completeStyle]}>
        <Text style={styles.glyph}>✓</Text>
      </Animated.View>
      <Animated.View style={[styles.action, styles.remove, deleteStyle]}>
        <Text style={styles.glyph}>✕</Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.row, { backgroundColor: color }, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: ROW_HEIGHT,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  action: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: 24 },
  complete: { backgroundColor: colors.complete, alignItems: 'flex-start' },
  remove: { backgroundColor: colors.remove, alignItems: 'flex-end' },
  glyph: { color: colors.text, fontSize: 24, fontWeight: '700' },
});
