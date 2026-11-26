import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SUGGESTIONS } from '../catalog';
import type { Suggestion } from '../catalog';
import { formatShort } from '../dates';
import { findPrevious, summarizeSets } from '../progress';
import { categoryColor, colors, fonts, MIN_HIT, radius, space } from '../theme';
import { CATEGORIES, CATEGORY_LABEL, EQUIPMENT, EQUIPMENT_LABEL, MUSCLE_LABEL, MUSCLES } from '../types';
import type { Category, Days, Equipment, Exercise, Muscle } from '../types';
import { Chip, SectionLabel } from './Controls';

type Focus = 'all' | Category | Muscle;

type Searchable = Pick<Exercise, 'name' | 'category' | 'equipment' | 'muscles'>;

type FinderProps = {
  exercises: Exercise[];
  days: Days;
  /** Sessions before this date count as "last time". */
  date: string;
  ownedAction?: { label: string; onPress: (exerciseId: string) => void };
  ideaAction: { label: string; onPress: (idea: Suggestion) => void };
  footer?: ReactNode;
};

const isCategory = (focus: Focus): focus is Category => CATEGORIES.some((category) => category === focus);

const inFocus = (item: Searchable, focus: Focus): boolean => {
  if (focus === 'all') return true;
  return isCategory(focus) ? item.category === focus : item.muscles.some((muscle) => muscle === focus);
};

/** Every word typed must appear in the name, a muscle, the category or the equipment. */
const matchesText = (item: Searchable, query: string): boolean => {
  const haystack = [
    item.name,
    CATEGORY_LABEL[item.category],
    EQUIPMENT_LABEL[item.equipment],
    ...item.muscles.map((muscle) => MUSCLE_LABEL[muscle]),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

const describe = (item: Searchable): string =>
  `${item.muscles.map((muscle) => MUSCLE_LABEL[muscle]).join(', ')} · ${EQUIPMENT_LABEL[item.equipment]}`;

export const Finder: FC<FinderProps> = ({ exercises, days, date, ownedAction, ideaAction, footer }) => {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<Focus>('all');
  const [equipment, setEquipment] = useState<Equipment | 'any'>('any');

  const wanted = (item: Searchable): boolean =>
    inFocus(item, focus) && (equipment === 'any' || item.equipment === equipment) && matchesText(item, query);
  const ownedNames = new Set(exercises.map((item) => item.name.toLowerCase()));
  const owned = exercises.filter(wanted);
  const ideas = SUGGESTIONS.filter((item) => wanted(item) && !ownedNames.has(item.name.toLowerCase()));

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextInput
        accessibilityLabel="Search exercises"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder="Search: back, kettlebell, curl…"
        placeholderTextColor={colors.textFaint}
        style={styles.search}
        value={query}
      />
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="All" onPress={() => setFocus('all')} selected={focus === 'all'} />
        {CATEGORIES.map((item) => (
          <Chip
            key={item}
            label={CATEGORY_LABEL[item]}
            onPress={() => setFocus(item)}
            selected={focus === item}
            tint={categoryColor[item]}
          />
        ))}
        {MUSCLES.map((item) => (
          <Chip key={item} label={MUSCLE_LABEL[item]} onPress={() => setFocus(item)} selected={focus === item} />
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="Any gear" onPress={() => setEquipment('any')} selected={equipment === 'any'} tint={colors.sunset} />
        {EQUIPMENT.map((item) => (
          <Chip
            key={item}
            label={EQUIPMENT_LABEL[item]}
            onPress={() => setEquipment(item)}
            selected={equipment === item}
            tint={colors.sunset}
          />
        ))}
      </ScrollView>

      {owned.length > 0 ? <SectionLabel>Your lifts</SectionLabel> : null}
      {owned.map((item) => {
        const previous = findPrevious(days, item.id, date);
        return (
          <Row
            action={ownedAction ? { label: ownedAction.label, onPress: () => ownedAction.onPress(item.id) } : undefined}
            detail={previous ? `${formatShort(previous.date)}: ${summarizeSets(previous.entry.sets)}` : 'Not logged yet'}
            key={item.id}
            meta={describe(item)}
            name={item.name}
            tint={categoryColor[item.category]}
          />
        );
      })}

      {ideas.length > 0 ? <SectionLabel>New ideas</SectionLabel> : null}
      {ideas.map((item) => (
        <Row
          action={{ label: ideaAction.label, onPress: () => ideaAction.onPress(item) }}
          detail={item.cue}
          key={item.name}
          meta={describe(item)}
          name={item.name}
          tint={categoryColor[item.category]}
        />
      ))}

      {owned.length === 0 && ideas.length === 0 ? <Text style={styles.empty}>Nothing matches that.</Text> : null}
      {footer}
    </ScrollView>
  );
};

type RowProps = {
  name: string;
  meta: string;
  detail: string;
  tint: string;
  action?: { label: string; onPress: () => void };
};

const Row: FC<RowProps> = ({ name, meta, detail, tint, action }) => (
  <View style={[styles.row, { borderLeftColor: tint }]}>
    <View style={styles.rowBody}>
      <Text style={styles.rowName}>{name}</Text>
      <Text style={styles.rowMeta}>{meta}</Text>
      <Text style={styles.rowDetail}>{detail}</Text>
    </View>
    {action ? (
      <Pressable
        accessibilityLabel={`${action.label} ${name}`}
        accessibilityRole="button"
        onPress={action.onPress}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>{action.label}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl * 2, paddingHorizontal: space.lg },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: MIN_HIT + 4,
    paddingHorizontal: space.md,
  },
  chips: { gap: space.sm, paddingTop: space.md },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginBottom: space.sm,
    paddingLeft: space.md,
  },
  rowBody: { flex: 1, paddingVertical: space.md },
  rowName: { color: colors.text, fontFamily: fonts.heading, fontSize: 21, textTransform: 'uppercase' },
  rowMeta: { color: colors.textDim, fontSize: 13, marginTop: 1 },
  rowDetail: { color: colors.textFaint, fontSize: 13, marginTop: 3 },
  action: { justifyContent: 'center', minHeight: MIN_HIT, paddingHorizontal: space.lg },
  actionText: { color: colors.accent, fontFamily: fonts.heading, fontSize: 17, letterSpacing: 1, textTransform: 'uppercase' },
  pressed: { opacity: 0.6 },
  empty: { color: colors.textDim, fontSize: 15, marginTop: space.xl, textAlign: 'center' },
});
