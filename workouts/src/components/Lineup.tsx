import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { categoryColor, colors, fonts, radius, space } from '../theme';
import type { Exercise } from '../types';
import { LINEUP_ROW } from './reorder';
import type { Reorder } from './reorder';

type LineupProps = {
  exercises: Exercise[];
  reorder: Reorder;
  /** Index of the held row, and where the finger is within this view. */
  from: number;
  fingerY: number;
  height: number;
};

const EDGE = 24;

/** The day's lifts as short rows, laid over the screen while one is dragged to a new place. */
export const Lineup: FC<LineupProps> = ({ exercises, reorder, from, fingerY, height }) => {
  const listHeight = exercises.length * LINEUP_ROW;
  const underFinger = fingerY - (from * LINEUP_ROW + LINEUP_ROW / 2);
  const top = Math.max(EDGE, Math.min(height - listHeight - EDGE, underFinger));

  return (
    <View pointerEvents="none" style={styles.veil}>
      <Text style={[styles.hint, { top: Math.max(0, top - 30) }]}>Drag to reorder</Text>
      <View style={[styles.list, { height: listHeight, top }]}>
        {exercises.map((exercise, index) => (
          <LineupRow count={exercises.length} exercise={exercise} index={index} key={`${exercise.id}-${index}`} reorder={reorder} />
        ))}
      </View>
    </View>
  );
};

type LineupRowProps = { exercise: Exercise; index: number; count: number; reorder: Reorder };

const LineupRow: FC<LineupRowProps> = ({ exercise, index, count, reorder }) => {
  const style = useAnimatedStyle(() => {
    const from = reorder.from.value;
    const to = reorder.to.value;
    if (index === from) {
      const lowest = -from * LINEUP_ROW;
      const highest = (count - 1 - from) * LINEUP_ROW;
      return {
        transform: [{ translateY: Math.max(lowest, Math.min(highest, reorder.dragY.value)) }, { scale: 1.04 }],
        zIndex: 2,
      };
    }
    const makesRoom = from < index && index <= to ? -1 : to <= index && index < from ? 1 : 0;
    return { transform: [{ translateY: withTiming(makesRoom * LINEUP_ROW, { duration: 140 }) }, { scale: 1 }], zIndex: 1 };
  });

  return (
    <Animated.View style={[styles.slot, style]}>
      <View style={[styles.row, { borderLeftColor: categoryColor[exercise.category] }]}>
        <Text numberOfLines={1} style={styles.name}>
          {exercise.name}
        </Text>
        <Text style={styles.grip}>≡</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  veil: { backgroundColor: 'rgba(11, 7, 19, 0.94)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.heading,
    fontSize: 14,
    left: space.lg,
    letterSpacing: 2,
    position: 'absolute',
    textTransform: 'uppercase',
  },
  list: { left: space.lg, position: 'absolute', right: space.lg },
  slot: { height: LINEUP_ROW, paddingVertical: 4 },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: space.md,
  },
  name: { color: colors.text, flex: 1, fontFamily: fonts.heading, fontSize: 22, textTransform: 'uppercase' },
  grip: { color: colors.textFaint, fontSize: 22 },
});
