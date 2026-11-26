import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import type { FC } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { formatLong, fromKey, todayKey } from '../dates';
import { findPrevious, hitTarget, judge } from '../progress';
import type { Previous, Verdict } from '../progress';
import type { NewExercise, Store } from '../store';
import { colors, MIN_HIT, radius, space } from '../theme';
import type { Exercise, SetEntry } from '../types';
import { Calendar } from './Calendar';
import type { Month } from './Calendar';
import { CardioSheet } from './CardioSheet';
import { Button } from './Controls';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';

type DayScreenProps = { store: Store };

const PULL_TO_ADD_DISTANCE = 70;

const DEFAULT_SET_COUNT = 3;

const monthOf = (key: string): Month => {
  const date = fromKey(key);
  return { year: date.getFullYear(), month: date.getMonth() };
};

/** Blank sets for a new entry, carrying over last session's weight and set count. */
const startingSets = (previous: Previous | null): SetEntry[] => {
  const before = previous?.entry.sets ?? [];
  const counted = before.filter((set) => !set.total).length;
  const weights = before.map((set) => set.weight).filter((weight) => weight !== null);
  const weight = weights.length > 0 ? Math.max(...weights) : null;
  return Array.from({ length: counted || DEFAULT_SET_COUNT }, () => ({ weight, reps: null }));
};

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
};

export const DayScreen: FC<DayScreenProps> = ({ store }) => {
  const [selected, setSelected] = useState(todayKey);
  const [month, setMonth] = useState<Month>(() => monthOf(todayKey()));
  const [picking, setPicking] = useState(false);
  const [addingCardio, setAddingCardio] = useState(false);
  const { exercises, days } = store.data;
  const day = days[selected];
  const lifts = day?.lifts ?? [];
  const cardio = day?.cardio ?? [];
  const byId = new Map(exercises.map((item) => [item.id, item]));

  const rows = lifts.flatMap((entry, index) => {
    const exercise = byId.get(entry.exerciseId);
    if (!exercise) return [];
    const previous = findPrevious(days, exercise.id, selected);
    return [{ entry, index, exercise, previous, verdict: judge(entry, previous, exercise) }];
  });
  const judged = rows.filter((row): row is typeof row & { verdict: Verdict } => row.verdict !== null);

  const pick = (exerciseId: string) => {
    store.addLift(selected, exerciseId, startingSets(findPrevious(days, exerciseId, selected)));
    setPicking(false);
    tap();
  };

  const create = (exercise: NewExercise) => {
    const created = store.addExercise(exercise);
    store.addLift(selected, created.id, startingSets(null));
    setPicking(false);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y > -PULL_TO_ADD_DISTANCE) return;
    tap();
    setPicking(true);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollEndDrag={handleScrollEnd}
      >
        <Calendar
          days={days}
          exercises={exercises}
          month={month}
          onMonthChange={setMonth}
          onSelect={setSelected}
          selected={selected}
        />

        <View style={styles.day}>
          <Text style={styles.date}>{formatLong(selected)}</Text>
          {lifts.length === 0 && cardio.length === 0 ? (
            <Text style={styles.empty}>Nothing logged. Pull down or tap below to add an exercise.</Text>
          ) : null}

          {rows.map(({ entry, index, exercise, previous, verdict }) => (
            <ExerciseCard
              canMoveDown={index < lifts.length - 1}
              canMoveUp={index > 0}
              entry={entry}
              exercise={exercise}
              key={`${exercise.id}-${index}`}
              onAddSet={() => store.addSet(selected, index)}
              onMove={(offset) => store.moveLift(selected, index, offset)}
              onRemove={() => store.removeLift(selected, index)}
              onRemoveSet={(setIndex) => store.removeSet(selected, index, setIndex)}
              onUpdateSet={(setIndex, patch) => store.updateSet(selected, index, setIndex, patch)}
              previous={previous}
              verdict={verdict}
            />
          ))}

          {cardio.map((entry) => (
            <View key={entry.id} style={styles.cardio}>
              <Text style={styles.cardioText}>
                {entry.kind} · {entry.minutes} min
              </Text>
              <Pressable
                accessibilityLabel={`Remove ${entry.kind}`}
                onPress={() => store.removeCardio(selected, entry.id)}
                style={styles.remove}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.actions}>
            <Button kind="primary" label="+ Exercise" onPress={() => setPicking(true)} style={styles.action} />
            <Button label="+ Cardio" onPress={() => setAddingCardio(true)} style={styles.action} />
          </View>

          {judged.length > 0 ? <Summary rows={judged} /> : null}
        </View>
      </ScrollView>

      <ExercisePicker
        date={selected}
        days={days}
        exercises={exercises}
        onClose={() => setPicking(false)}
        onCreate={create}
        onPick={pick}
        visible={picking}
      />
      <CardioSheet
        onAdd={(kind, minutes) => {
          store.addCardio(selected, kind, minutes);
          setAddingCardio(false);
        }}
        onClose={() => setAddingCardio(false)}
        visible={addingCardio}
      />
    </>
  );
};

type SummaryRow = { exercise: Exercise; verdict: Verdict; entry: { sets: SetEntry[]; exerciseId: string } };

const Summary: FC<{ rows: SummaryRow[] }> = ({ rows }) => {
  const count = (trend: Verdict['trend']) => rows.filter((row) => row.verdict.trend === trend).length;
  const toRaise = rows.filter((row) => hitTarget(row.entry, row.exercise.repTarget)).map((row) => row.exercise.name);

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Workout summary</Text>
      <View style={styles.tallies}>
        <Tally color={colors.up} label="Up" value={count('up')} />
        <Tally color={colors.textDim} label="Same" value={count('same')} />
        <Tally color={colors.down} label="Down" value={count('down')} />
        <Tally color={colors.accent} label="New" value={count('first')} />
      </View>
      {toRaise.length > 0 ? (
        <Text style={styles.raise}>Raise the weight next time: {toRaise.join(', ')}</Text>
      ) : (
        <Text style={styles.hold}>No exercise reached its rep target, so keep these weights.</Text>
      )}
    </View>
  );
};

const Tally: FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={styles.tally}>
    <Text style={[styles.tallyValue, { color }]}>{value}</Text>
    <Text style={styles.tallyLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl * 3 },
  day: { paddingHorizontal: space.lg, paddingTop: space.lg },
  date: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: space.md },
  empty: { color: colors.textDim, fontSize: 15, marginBottom: space.md },
  cardio: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderLeftColor: colors.cardio,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginBottom: space.md,
    paddingLeft: space.md,
  },
  cardioText: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '600' },
  remove: { alignItems: 'center', height: MIN_HIT + 4, justifyContent: 'center', width: MIN_HIT },
  removeText: { color: colors.textDim, fontSize: 18 },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
  summary: { backgroundColor: colors.surface, borderRadius: radius.md, marginTop: space.xl, padding: space.lg },
  summaryTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  tallies: { flexDirection: 'row', marginVertical: space.md },
  tally: { alignItems: 'center', flex: 1 },
  tallyValue: { fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '800' },
  tallyLabel: { color: colors.textDim, fontSize: 12 },
  raise: { color: colors.raise, fontSize: 15, fontWeight: '600' },
  hold: { color: colors.textDim, fontSize: 14 },
});
