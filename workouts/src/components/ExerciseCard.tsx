import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatShort } from '../dates';
import { hitTarget, summarizeSets } from '../progress';
import type { Previous, Verdict } from '../progress';
import { categoryColor, colors, MIN_HIT, radius, space } from '../theme';
import type { Exercise, LiftEntry, SetEntry } from '../types';
import { Button, NumberField } from './Controls';

type ExerciseCardProps = {
  exercise: Exercise;
  entry: LiftEntry;
  previous: Previous | null;
  verdict: Verdict | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetEntry>) => void;
  onRemoveSet: (setIndex: number) => void;
};

const TREND_LABEL = { up: '▲ Up', down: '▼ Down', same: '● Same', first: '★ New' } as const;

const TREND_COLOR = { up: colors.up, down: colors.down, same: colors.textDim, first: colors.accent } as const;

export const ExerciseCard: FC<ExerciseCardProps> = ({
  exercise,
  entry,
  previous,
  verdict,
  canMoveUp,
  canMoveDown,
  onMove,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}) => {
  const dueForRaise = previous !== null && hitTarget(previous.entry, exercise.repTarget);

  return (
    <View style={[styles.card, { borderLeftColor: categoryColor[exercise.category] }]}>
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        <IconButton disabled={!canMoveUp} label="Move up" onPress={() => onMove(-1)} symbol="↑" />
        <IconButton disabled={!canMoveDown} label="Move down" onPress={() => onMove(1)} symbol="↓" />
        <IconButton label={`Remove ${exercise.name}`} onPress={onRemove} symbol="✕" />
      </View>

      {previous ? (
        <Text style={styles.previous}>
          Last time ({formatShort(previous.date)}): {summarizeSets(previous.entry.sets)}
        </Text>
      ) : (
        <Text style={styles.previous}>No earlier session</Text>
      )}
      {dueForRaise ? (
        <Text style={styles.raise}>
          You hit {exercise.repTarget} reps last time — go heavier today.
        </Text>
      ) : null}
      {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}

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
            value={set.reps}
          />
          <IconButton label={`Remove set ${setIndex + 1}`} onPress={() => onRemoveSet(setIndex)} symbol="−" />
        </View>
      ))}

      <View style={styles.footer}>
        <Button label="+ Add set" onPress={onAddSet} />
        {verdict ? (
          <View style={styles.verdict}>
            <Text style={[styles.trend, { color: TREND_COLOR[verdict.trend] }]}>{TREND_LABEL[verdict.trend]}</Text>
            <Text style={styles.detail}>{verdict.detail}</Text>
            {verdict.raise ? <Text style={styles.raiseNext}>Raise the weight next time</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

type IconButtonProps = { symbol: string; label: string; onPress: () => void; disabled?: boolean };

const IconButton: FC<IconButtonProps> = ({ symbol, label, onPress, disabled = false }) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.icon, pressed && styles.pressed, disabled && styles.disabled]}
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
    paddingTop: space.xs,
  },
  header: { alignItems: 'center', flexDirection: 'row' },
  name: { color: colors.text, flex: 1, fontSize: 18, fontWeight: '700' },
  previous: { color: colors.textDim, fontSize: 13, marginBottom: space.xs, paddingRight: space.sm },
  raise: { color: colors.raise, fontSize: 13, fontWeight: '600', marginBottom: space.xs },
  note: { color: colors.textFaint, fontSize: 13, fontStyle: 'italic', marginBottom: space.xs },
  setRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  setLabel: { color: colors.textFaint, fontSize: 14, fontVariant: ['tabular-nums'], textAlign: 'center', width: 24 },
  times: { color: colors.textFaint, fontSize: 16 },
  footer: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  verdict: { alignItems: 'flex-end', flex: 1, paddingRight: space.sm, paddingTop: space.sm },
  trend: { fontSize: 15, fontWeight: '800' },
  detail: { color: colors.textDim, fontSize: 13, fontVariant: ['tabular-nums'], marginTop: 2, textAlign: 'right' },
  raiseNext: { color: colors.raise, fontSize: 13, fontWeight: '700', marginTop: 2 },
  icon: { alignItems: 'center', height: MIN_HIT, justifyContent: 'center', width: 38 },
  iconText: { color: colors.textDim, fontSize: 18 },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.25 },
});
