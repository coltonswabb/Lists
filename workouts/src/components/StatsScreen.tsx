import { useState } from 'react';
import type { FC } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { addDays, formatShort, todayKey } from '../dates';
import { bestWeight, CALL_TEXT, callFor, historyOf, summarizeSets, weeklySets } from '../progress';
import type { Store } from '../store';
import { categoryColor, colors, fonts, radius, space, zoneColor } from '../theme';
import { CATEGORIES, CATEGORY_LABEL } from '../types';
import type { Category, Days, Exercise } from '../types';
import { SectionLabel } from './Controls';

type StatsScreenProps = { store: Store };

const HISTORY_SHOWN = 5;

const lowestCategory = (counts: Record<Category, number>): Category =>
  CATEGORIES.reduce((lowest, category) => (counts[category] < counts[lowest] ? category : lowest), 'push');

const sessionsThisWeek = (days: Days, today: string): number =>
  Array.from({ length: 7 }, (_, offset) => days[addDays(today, -offset)]).filter(Boolean).length;

export const StatsScreen: FC<StatsScreenProps> = ({ store }) => {
  const { exercises, days } = store.data;
  const today = todayKey();
  const counts = weeklySets(days, exercises, today);
  const lagging = lowestCategory(counts);
  const most = Math.max(1, ...CATEGORIES.map((category) => counts[category]));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>The numbers</Text>
      <SectionLabel>Last 7 days · {sessionsThisWeek(days, today)} sessions</SectionLabel>
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
          {CATEGORY_LABEL[lagging]} is behind this week. Look some up under Find.
        </Text>
      </View>

      {CATEGORIES.map((category) => (
        <View key={category}>
          <SectionLabel color={categoryColor[category]}>{CATEGORY_LABEL[category]}</SectionLabel>
          {exercises
            .filter((item) => item.category === category)
            .map((item) => (
              <LiftRow
                days={days}
                exercise={item}
                key={item.id}
                onToggle={() => setOpen(open === item.id ? null : item.id)}
                open={open === item.id}
              />
            ))}
        </View>
      ))}
    </ScrollView>
  );
};

type LiftRowProps = { exercise: Exercise; days: Days; open: boolean; onToggle: () => void };

const LiftRow: FC<LiftRowProps> = ({ exercise, days, open, onToggle }) => {
  const history = historyOf(days, exercise.id);
  const latest = history[0];
  const call = latest ? callFor(latest.entry, exercise) : null;
  const best = bestWeight(days, exercise.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={[styles.row, { borderLeftColor: categoryColor[exercise.category] }]}
    >
      <View style={styles.rowTop}>
        <Text numberOfLines={1} style={styles.rowName}>
          {exercise.name}
        </Text>
        <Text style={styles.best}>{best > 0 ? `${best} lb` : '—'}</Text>
      </View>
      {latest ? (
        <Text style={styles.rowDetail}>
          {formatShort(latest.date)}: {summarizeSets(latest.entry.sets)}
        </Text>
      ) : (
        <Text style={styles.rowDetail}>Not logged yet</Text>
      )}
      {call ? <Text style={[styles.call, { color: zoneColor[call] }]}>{CALL_TEXT[call]}</Text> : null}
      {open
        ? history.slice(1, HISTORY_SHOWN + 1).map((session) => (
            <Text key={session.date} style={styles.history}>
              {formatShort(session.date)}: {summarizeSets(session.entry.sets)}
            </Text>
          ))
        : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 32, textTransform: 'uppercase' },
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm, height: 30 },
  barLabel: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, textTransform: 'uppercase', width: 48 },
  barTrack: { backgroundColor: colors.surfaceRaised, borderRadius: 2, flex: 1, height: 10 },
  bar: { borderRadius: 2, height: 10 },
  barValue: { color: colors.textDim, fontSize: 13, fontVariant: ['tabular-nums'], textAlign: 'right', width: 56 },
  lagging: { color: colors.gold, fontSize: 13, fontWeight: '600', marginTop: space.sm },
  row: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  rowTop: { alignItems: 'baseline', flexDirection: 'row', gap: space.sm },
  rowName: { color: colors.text, flex: 1, fontFamily: fonts.heading, fontSize: 21, textTransform: 'uppercase' },
  best: { color: colors.text, fontFamily: fonts.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  rowDetail: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  call: { fontFamily: fonts.label, fontSize: 14, letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' },
  history: { color: colors.textFaint, fontSize: 13, fontVariant: ['tabular-nums'], marginTop: space.xs },
});
