import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureStateManager, usePanGesture } from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { formatShort } from '../dates';
import { CALL_TEXT, callFor, summarizeSets, zoneOf } from '../progress';
import type { Previous, Verdict, Zone } from '../progress';
import { categoryColor, colors, fonts, MIN_HIT, radius, space, zoneColor } from '../theme';
import type { Exercise, LiftEntry, SetEntry } from '../types';
import { Button, NumberField } from './Controls';
import { HOLD_TO_DRAG_MS, LINEUP_ROW } from './reorder';
import type { Reorder } from './reorder';

type ExerciseCardProps = {
  exercise: Exercise;
  entry: LiftEntry;
  previous: Previous | null;
  verdict: Verdict | null;
  index: number;
  count: number;
  reorder: Reorder;
  onDragStart: (index: number, fingerY: number) => void;
  onDrop: (from: number, to: number) => void;
  onTick: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetEntry>) => void;
  onRemoveSet: (setIndex: number) => void;
};

const TREND_LABEL = { up: '▲ Up', down: '▼ Down', same: '● Same', first: '★ New' } as const;

const TREND_COLOR = { up: colors.up, down: colors.down, same: colors.textDim, first: colors.accent } as const;

/** What last session says to do today. */
const CARRY_OVER: Record<Zone, string | null> = {
  raise: 'You hit the top of the range last time — go heavier today.',
  solid: null,
  heavy: 'Last time was heavy — stay at this weight.',
  drop: 'Last time fell under the range — go lighter today.',
};

const HOLD_SLOP = 8;

export const ExerciseCard: FC<ExerciseCardProps> = ({
  exercise,
  entry,
  previous,
  verdict,
  index,
  count,
  reorder,
  onDragStart,
  onDrop,
  onTick,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}) => {
  const previousCall = previous ? callFor(previous.entry, exercise) : null;
  const carryOver = previousCall ? CARRY_OVER[previousCall] : null;
  const holdX = useSharedValue(0);
  const holdY = useSharedValue(0);
  const holdOver = useSharedValue(true);

  const drag = usePanGesture({
    enabled: count > 1,
    maxPointers: 1,
    activateAfterLongPress: HOLD_TO_DRAG_MS,
    onTouchesDown: (event) => {
      'worklet';
      const touch = event.allTouches[0];
      if (!touch || event.numberOfTouches !== 1) {
        holdOver.set(true);
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      holdOver.set(false);
      holdX.set(touch.absoluteX);
      holdY.set(touch.absoluteY);
    },
    onTouchesMove: (event) => {
      'worklet';
      if (holdOver.value || reorder.from.value >= 0) return;
      const touch = event.allTouches[0];
      if (!touch) return;
      // Moving before the hold has matured is a scroll, not a drag.
      const moved = Math.abs(touch.absoluteX - holdX.value) > HOLD_SLOP || Math.abs(touch.absoluteY - holdY.value) > HOLD_SLOP;
      if (moved) {
        holdOver.set(true);
        GestureStateManager.fail(event.handlerTag);
      }
    },
    onActivate: () => {
      'worklet';
      reorder.dragY.set(0);
      reorder.from.set(index);
      reorder.to.set(index);
      scheduleOnRN(onDragStart, index, holdY.value);
    },
    onUpdate: (event) => {
      'worklet';
      if (reorder.from.value !== index) return;
      reorder.dragY.set(event.translationY);
      const target = Math.round(index + event.translationY / LINEUP_ROW);
      const to = Math.max(0, Math.min(count - 1, target));
      if (to !== reorder.to.value) {
        reorder.to.set(to);
        scheduleOnRN(onTick);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (reorder.from.value !== index) return;
      const to = reorder.to.value;
      reorder.dragY.set(
        withTiming((to - index) * LINEUP_ROW, { duration: 120 }, () => {
          scheduleOnRN(onDrop, index, to);
        }),
      );
    },
  });

  return (
    <View style={[styles.card, { borderLeftColor: categoryColor[exercise.category] }]}>
      <View style={styles.header}>
        <GestureDetector gesture={drag}>
          <View accessibilityHint="Hold and drag to reorder" style={styles.handle}>
            <Text style={styles.grip}>≡</Text>
            <Text numberOfLines={1} style={styles.name}>
              {exercise.name}
            </Text>
          </View>
        </GestureDetector>
        <IconButton label={`Remove ${exercise.name}`} onPress={onRemove} symbol="✕" />
      </View>

      <Text style={styles.previous}>
        {previous
          ? `Last time (${formatShort(previous.date)}): ${summarizeSets(previous.entry.sets)}`
          : 'No earlier session'}
      </Text>
      {carryOver && previousCall ? <Text style={[styles.carry, { color: zoneColor[previousCall] }]}>{carryOver}</Text> : null}
      {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}

      <Text style={styles.range}>
        Aim for {exercise.repMin}–{exercise.repTarget} reps a set
      </Text>
      {entry.sets.map((set, setIndex) => (
        <View key={`${setIndex}-${entry.sets.length}`} style={styles.setRow}>
          <Text style={styles.setLabel}>{set.total ? 'All' : setIndex + 1}</Text>
          <NumberField
            decimal
            label={`Set ${setIndex + 1} weight`}
            onChange={(weight) => onUpdateSet(setIndex, { weight })}
            placeholder="lb"
            value={set.weight}
          />
          <Text style={styles.times}>×</Text>
          <NumberField
            label={`Set ${setIndex + 1} reps`}
            onChange={(reps) => onUpdateSet(setIndex, { reps })}
            placeholder={set.total ? 'total' : 'reps'}
            tint={set.reps && !set.total ? zoneColor[zoneOf(set.reps, exercise)] : undefined}
            value={set.reps}
          />
          <IconButton label={`Remove set ${setIndex + 1}`} onPress={() => onRemoveSet(setIndex)} symbol="−" />
        </View>
      ))}

      <View style={styles.footer}>
        <Button label="+ Set" onPress={onAddSet} />
        {verdict ? (
          <View style={styles.verdict}>
            <Text style={[styles.trend, { color: TREND_COLOR[verdict.trend] }]}>{TREND_LABEL[verdict.trend]}</Text>
            <Text style={styles.detail}>{verdict.detail}</Text>
            <Text style={[styles.call, { color: zoneColor[verdict.call] }]}>{CALL_TEXT[verdict.call]}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

type IconButtonProps = { symbol: string; label: string; onPress: () => void };

const IconButton: FC<IconButtonProps> = ({ symbol, label, onPress }) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
  >
    <Text style={styles.iconText}>{symbol}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    marginBottom: space.md,
    paddingBottom: space.xs,
    paddingLeft: space.md,
    paddingRight: space.xs,
  },
  header: { alignItems: 'center', flexDirection: 'row' },
  handle: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: space.sm, minHeight: MIN_HIT + 4 },
  grip: { color: colors.textFaint, fontSize: 20 },
  name: { color: colors.text, flex: 1, fontFamily: fonts.display, fontSize: 26, textTransform: 'uppercase' },
  previous: { color: colors.textDim, fontSize: 13, paddingRight: space.sm },
  carry: { fontSize: 13, fontWeight: '700', marginTop: space.xs, paddingRight: space.sm },
  note: { color: colors.textFaint, fontSize: 13, fontStyle: 'italic', marginTop: space.xs },
  range: {
    color: colors.textFaint,
    fontFamily: fonts.label,
    fontSize: 13,
    letterSpacing: 1.5,
    marginTop: space.md,
    textTransform: 'uppercase',
  },
  setRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  setLabel: { color: colors.textFaint, fontFamily: fonts.heading, fontSize: 18, textAlign: 'center', width: 24 },
  times: { color: colors.textFaint, fontSize: 16 },
  footer: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  verdict: { alignItems: 'flex-end', flex: 1, paddingBottom: space.sm, paddingRight: space.sm, paddingTop: space.sm },
  trend: { fontFamily: fonts.display, fontSize: 22, textTransform: 'uppercase' },
  detail: { color: colors.textDim, fontSize: 13, fontVariant: ['tabular-nums'], marginTop: 1, textAlign: 'right' },
  call: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: 0.5, marginTop: 2, textTransform: 'uppercase' },
  icon: { alignItems: 'center', height: MIN_HIT, justifyContent: 'center', width: 40 },
  iconText: { color: colors.textDim, fontSize: 18 },
  pressed: { opacity: 0.5 },
});
