import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import type { ComponentRef, FC } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { formatLong, fromKey, todayKey } from '../dates';
import { CALL_TEXT, findPrevious, judge } from '../progress';
import type { Verdict, Zone } from '../progress';
import type { NewExercise, Store } from '../store';
import { colors, fonts, MIN_HIT, radius, space, zoneColor } from '../theme';
import { SETS_PER_EXERCISE } from '../types';
import type { Exercise, SetEntry } from '../types';
import { Calendar } from './Calendar';
import type { Month } from './Calendar';
import { CardioSheet } from './CardioSheet';
import { Button, Sunset } from './Controls';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';
import { Lineup } from './Lineup';
import type { Reorder } from './reorder';

type DayScreenProps = { store: Store };

type Dragging = { from: number; fingerY: number };

const PULL_TO_ADD_DISTANCE = 70;

const monthOf = (key: string): Month => {
  const date = fromKey(key);
  return { year: date.getFullYear(), month: date.getMonth() };
};

/** Three blank sets at the heaviest weight used last session. */
const startingSets = (lastSets: SetEntry[]): SetEntry[] => {
  const weights = lastSets.map((set) => set.weight).filter((weight) => weight !== null);
  const weight = weights.length > 0 ? Math.max(...weights) : null;
  return Array.from({ length: SETS_PER_EXERCISE }, () => ({ weight, reps: null }));
};

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
};

export const DayScreen: FC<DayScreenProps> = ({ store }) => {
  const [selected, setSelected] = useState(todayKey);
  const [month, setMonth] = useState<Month>(() => monthOf(todayKey()));
  const [picking, setPicking] = useState(false);
  const [addingCardio, setAddingCardio] = useState(false);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [frame, setFrame] = useState({ top: 0, height: 0 });
  const root = useRef<ComponentRef<typeof View>>(null);
  const from = useSharedValue(-1);
  const to = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const reorder: Reorder = { from, to, dragY };

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
  const judged = rows.flatMap(({ exercise, verdict }) => (verdict ? [{ exercise, verdict }] : []));

  const addLift = (exerciseId: string) => {
    store.addLift(selected, exerciseId, startingSets(findPrevious(days, exerciseId, selected)?.entry.sets ?? []));
    setPicking(false);
    tick();
  };

  const create = (exercise: NewExercise) => {
    const existing = exercises.find((item) => item.name.toLowerCase() === exercise.name.toLowerCase());
    addLift((existing ?? store.addExercise(exercise)).id);
  };

  const measure = () => {
    root.current?.measureInWindow((_x, y, _width, height) => setFrame({ top: y, height }));
  };

  const startDrag = (index: number, fingerY: number) => {
    tick();
    setDragging({ from: index, fingerY: fingerY - frame.top });
  };

  const drop = (fromIndex: number, toIndex: number) => {
    store.moveLift(selected, fromIndex, toIndex);
    from.set(-1);
    setDragging(null);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y > -PULL_TO_ADD_DISTANCE) return;
    tick();
    setPicking(true);
  };

  return (
    <View onLayout={measure} ref={root} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollEndDrag={handleScrollEnd}
        scrollEnabled={dragging === null}
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
            <Text style={styles.empty}>Nothing on the board. Pull down or tap below to add a lift.</Text>
          ) : null}

          {rows.map(({ entry, index, exercise, previous, verdict }) => (
            <ExerciseCard
              count={lifts.length}
              entry={entry}
              exercise={exercise}
              index={index}
              key={`${exercise.id}-${index}`}
              onAddSet={() => store.addSet(selected, index)}
              onDragStart={startDrag}
              onDrop={drop}
              onRemove={() => store.removeLift(selected, index)}
              onRemoveSet={(setIndex) => store.removeSet(selected, index, setIndex)}
              onTick={tick}
              onUpdateSet={(setIndex, patch) => store.updateSet(selected, index, setIndex, patch)}
              previous={previous}
              reorder={reorder}
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
            <Button kind="primary" label="+ Lift" onPress={() => setPicking(true)} style={styles.action} />
            <Button label="+ Cardio" onPress={() => setAddingCardio(true)} style={styles.action} />
          </View>

          {judged.length > 0 ? <Report rows={judged} /> : null}
        </View>
      </ScrollView>

      {dragging ? (
        <Lineup
          exercises={rows.map((row) => row.exercise)}
          fingerY={dragging.fingerY}
          from={dragging.from}
          height={frame.height}
          reorder={reorder}
        />
      ) : null}

      <ExercisePicker
        date={selected}
        days={days}
        exercises={exercises}
        onClose={() => setPicking(false)}
        onCreate={create}
        onPick={addLift}
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
    </View>
  );
};

type ReportRow = { exercise: Exercise; verdict: Verdict };

const CALL_ORDER: Zone[] = ['raise', 'solid', 'heavy', 'drop'];

/** The end-of-session board: how each lift moved and what to load next time. */
const Report: FC<{ rows: ReportRow[] }> = ({ rows }) => {
  const count = (trend: Verdict['trend']) => rows.filter((row) => row.verdict.trend === trend).length;

  return (
    <View style={styles.report}>
      <Sunset style={styles.reportBand} />
      <Text style={styles.reportTitle}>Session report</Text>
      <View style={styles.tallies}>
        <Tally color={colors.up} label="Up" value={count('up')} />
        <Tally color={colors.textDim} label="Same" value={count('same')} />
        <Tally color={colors.down} label="Down" value={count('down')} />
        <Tally color={colors.accent} label="New" value={count('first')} />
      </View>
      {CALL_ORDER.map((call) => {
        const names = rows.filter((row) => row.verdict.call === call).map((row) => row.exercise.name);
        if (names.length === 0) return null;
        return (
          <View key={call} style={styles.callRow}>
            <Text style={[styles.callLabel, { color: zoneColor[call] }]}>{CALL_TEXT[call]}</Text>
            <Text style={styles.callNames}>{names.join(', ')}</Text>
          </View>
        );
      })}
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
  root: { flex: 1 },
  content: { paddingBottom: space.xl * 3 },
  day: { paddingHorizontal: space.lg, paddingTop: space.lg },
  date: { color: colors.text, fontFamily: fonts.display, fontSize: 32, marginBottom: space.md, textTransform: 'uppercase' },
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
  cardioText: { color: colors.text, flex: 1, fontFamily: fonts.heading, fontSize: 22, textTransform: 'uppercase' },
  remove: { alignItems: 'center', height: MIN_HIT + 4, justifyContent: 'center', width: MIN_HIT },
  removeText: { color: colors.textDim, fontSize: 18 },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
  report: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: space.xl,
    overflow: 'hidden',
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
  },
  reportBand: { height: 6, marginHorizontal: -space.lg },
  reportTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 30, marginTop: space.md, textTransform: 'uppercase' },
  tallies: { flexDirection: 'row', marginVertical: space.md },
  tally: { alignItems: 'center', flex: 1 },
  tallyValue: { fontFamily: fonts.display, fontSize: 40, fontVariant: ['tabular-nums'] },
  tallyLabel: { color: colors.textDim, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  callRow: { marginTop: space.sm },
  callLabel: { fontFamily: fonts.heading, fontSize: 17, letterSpacing: 0.5, textTransform: 'uppercase' },
  callNames: { color: colors.text, fontSize: 15, marginTop: 1 },
});
