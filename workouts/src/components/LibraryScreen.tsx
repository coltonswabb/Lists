import { useState } from 'react';
import type { FC } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SUGGESTIONS } from '../catalog';
import { formatShort, todayKey } from '../dates';
import { findPrevious, summarizeSets, weeklySets } from '../progress';
import type { Store } from '../store';
import { categoryColor, colors, MIN_HIT, radius, space } from '../theme';
import { CATEGORIES, CATEGORY_LABEL, EQUIPMENT, EQUIPMENT_LABEL } from '../types';
import type { Category, Equipment } from '../types';
import { Chip } from './Controls';

type LibraryScreenProps = { store: Store };

const lowestCategory = (counts: Record<Category, number>): Category =>
  CATEGORIES.reduce((lowest, category) => (counts[category] < counts[lowest] ? category : lowest), 'push');

export const LibraryScreen: FC<LibraryScreenProps> = ({ store }) => {
  const { exercises, days } = store.data;
  const today = todayKey();
  const counts = weeklySets(days, exercises, today);
  const lagging = lowestCategory(counts);
  const [focus, setFocus] = useState<Category>(lagging);
  const [equipment, setEquipment] = useState<Equipment>('centr3');
  const most = Math.max(1, ...CATEGORIES.map((category) => counts[category]));
  const owned = new Set(exercises.map((item) => item.name.toLowerCase()));
  const ideas = SUGGESTIONS.filter(
    (item) => item.category === focus && item.equipment === equipment && !owned.has(item.name.toLowerCase()),
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Last 7 days</Text>
      <View style={styles.panel}>
        {CATEGORIES.map((category) => (
          <View key={category} style={styles.barRow}>
            <Text style={styles.barLabel}>{CATEGORY_LABEL[category]}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: categoryColor[category], width: `${(counts[category] / most) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{counts[category]} sets</Text>
          </View>
        ))}
        <Text style={styles.lagging}>
          {CATEGORY_LABEL[lagging]} has had the least work this week.
        </Text>
      </View>

      <Text style={styles.heading}>Ideas to add</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABEL[category]}
            onPress={() => setFocus(category)}
            selected={category === focus}
            tint={categoryColor[category]}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {EQUIPMENT.filter((item) => item !== 'bodyweight').map((item) => (
          <Chip
            key={item}
            label={EQUIPMENT_LABEL[item]}
            onPress={() => setEquipment(item)}
            selected={item === equipment}
          />
        ))}
      </View>
      {ideas.length === 0 ? <Text style={styles.empty}>Nothing left to suggest for this combination.</Text> : null}
      {ideas.map((idea) => (
        <View key={idea.name} style={styles.row}>
          <Text style={styles.rowName}>{idea.name}</Text>
          <Pressable
            accessibilityLabel={`Add ${idea.name} to my exercises`}
            accessibilityRole="button"
            onPress={() => store.addExercise(idea)}
            style={styles.add}
          >
            <Text style={styles.addText}>+ Add</Text>
          </Pressable>
        </View>
      ))}

      {CATEGORIES.map((category) => (
        <View key={category}>
          <Text style={[styles.heading, { color: categoryColor[category] }]}>My {CATEGORY_LABEL[category]}</Text>
          {exercises
            .filter((item) => item.category === category)
            .map((item) => {
              const previous = findPrevious(days, item.id, '9999-12-31');
              return (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDetail}>
                      {EQUIPMENT_LABEL[item.equipment]}
                      {previous ? ` · ${formatShort(previous.date)}: ${summarizeSets(previous.entry.sets)}` : ''}
                    </Text>
                  </View>
                  <View style={styles.target}>
                    <Pressable
                      accessibilityLabel={`Lower rep target for ${item.name}`}
                      disabled={item.repTarget <= 1}
                      onPress={() => store.updateExercise(item.id, { repTarget: item.repTarget - 1 })}
                      style={styles.step}
                    >
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <View style={styles.targetValue}>
                      <Text style={styles.targetNumber}>{item.repTarget}</Text>
                      <Text style={styles.targetLabel}>reps</Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Raise rep target for ${item.name}`}
                      onPress={() => store.updateExercise(item.id, { repTarget: item.repTarget + 1 })}
                      style={styles.step}
                    >
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
        </View>
      ))}
      <Text style={styles.footnote}>
        The reps number is the target: reach it in a set and the app tells you to raise the weight.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  heading: { color: colors.textDim, fontSize: 13, fontWeight: '700', marginBottom: space.sm, marginTop: space.lg },
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm, height: 28 },
  barLabel: { color: colors.text, fontSize: 14, width: 44 },
  barTrack: { backgroundColor: colors.surfaceRaised, borderRadius: 4, flex: 1, height: 8 },
  bar: { borderRadius: 4, height: 8 },
  barValue: { color: colors.textDim, fontSize: 13, fontVariant: ['tabular-nums'], textAlign: 'right', width: 56 },
  lagging: { color: colors.raise, fontSize: 13, fontWeight: '600', marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  empty: { color: colors.textFaint, fontSize: 14 },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginBottom: space.sm,
    minHeight: MIN_HIT + 8,
    paddingLeft: space.md,
  },
  rowBody: { flex: 1, paddingVertical: space.sm },
  rowName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '600' },
  rowDetail: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  add: { height: MIN_HIT, justifyContent: 'center', paddingHorizontal: space.lg },
  addText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  target: { alignItems: 'center', flexDirection: 'row' },
  step: { alignItems: 'center', height: MIN_HIT, justifyContent: 'center', width: 36 },
  stepText: { color: colors.accent, fontSize: 20 },
  targetValue: { alignItems: 'center', width: 30 },
  targetNumber: { color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '700' },
  targetLabel: { color: colors.textFaint, fontSize: 10 },
  footnote: { color: colors.textFaint, fontSize: 12, marginTop: space.md },
});
