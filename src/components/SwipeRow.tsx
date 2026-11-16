import type { FC, ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  useLongPressGesture,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
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
const SPRING = { damping: 22, stiffness: 260 } as const;

type SwipeRowProps = {
  color: string;
  children: ReactNode;
  onDelete: () => void;
  /** Swipe right. Rows without it only rubber-band in that direction. */
  onComplete?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
};

export const SwipeRow: FC<SwipeRowProps> = ({ color, children, onDelete, onComplete, onPress, onLongPress }) => {
  const { width } = useWindowDimensions();
  const offsetX = useSharedValue(0);
  const armed = useSharedValue(0);
  const canComplete = onComplete !== undefined;

  const complete = () => {
    thud();
    onComplete?.();
  };

  const pan = usePanGesture({
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

  // Tap and long-press are gestures (not a Pressable) so a swipe or pull can never also fire a press.
  const tap = useTapGesture({
    enabled: onPress !== undefined,
    maxDistance: TAP_SLOP,
    maxDuration: 400,
    onActivate: () => {
      'worklet';
      if (onPress) scheduleOnRN(onPress);
    },
  });
  const longPress = useLongPressGesture({
    enabled: onLongPress !== undefined,
    maxDistance: TAP_SLOP,
    onActivate: () => {
      'worklet';
      if (onLongPress) scheduleOnRN(onLongPress);
    },
  });
  const gesture = useCompetingGestures(pan, longPress, tap);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offsetX.value }] }));
  const completeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetX.value, [0, TRIGGER_DISTANCE], [0, 1], 'clamp'),
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetX.value, [-TRIGGER_DISTANCE, 0], [1, 0], 'clamp'),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.action, styles.complete, completeStyle]}>
        <Text style={styles.glyph}>✓</Text>
      </Animated.View>
      <Animated.View style={[styles.action, styles.remove, deleteStyle]}>
        <Text style={styles.glyph}>✕</Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.row, { backgroundColor: color }, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: ROW_HEIGHT, backgroundColor: colors.background },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  action: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: 24 },
  complete: { backgroundColor: colors.complete, alignItems: 'flex-start' },
  remove: { backgroundColor: colors.remove, alignItems: 'flex-end' },
  glyph: { color: colors.text, fontSize: 24, fontWeight: '700' },
});
