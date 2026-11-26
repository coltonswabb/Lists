import { useState } from 'react';
import type { FC } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatShort } from '../dates';
import { findPrevious, summarizeSets } from '../progress';
import type { NewExercise } from '../store';
import { categoryColor, colors, MIN_HIT, radius, space } from '../theme';
import { CATEGORIES, CATEGORY_LABEL, EQUIPMENT, EQUIPMENT_LABEL } from '../types';
import type { Category, Days, Equipment, Exercise } from '../types';
import { Button, Chip, Sheet } from './Controls';

type ExercisePickerProps = {
  visible: boolean;
  date: string;
  exercises: Exercise[];
  days: Days;
  onPick: (exerciseId: string) => void;
  onCreate: (exercise: NewExercise) => void;
  onClose: () => void;
};

export const ExercisePicker: FC<ExercisePickerProps> = ({
  visible,
  date,
  exercises,
  days,
  onPick,
  onCreate,
  onClose,
}) => {
  const [category, setCategory] = useState<Category>('push');
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('centr3');
  const alreadyToday = new Set(days[date]?.lifts.map((lift) => lift.exerciseId));
  const trimmed = name.trim();

  const create = () => {
    onCreate({ name: trimmed, category, equipment });
    setName('');
  };

  return (
    <Sheet onClose={onClose} title="Add exercise" visible={visible}>
      <View style={styles.chips}>
        {CATEGORIES.map((item) => (
          <Chip
            key={item}
            label={CATEGORY_LABEL[item]}
            onPress={() => setCategory(item)}
            selected={item === category}
            tint={categoryColor[item]}
          />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {exercises
          .filter((item) => item.category === category)
          .map((item) => {
            const previous = findPrevious(days, item.id, date);
            return (
              <Pressable
                accessibilityRole="button"
                key={item.id}
                onPress={() => onPick(item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.rowName}>
                  {item.name}
                  {alreadyToday.has(item.id) ? '  ✓' : ''}
                </Text>
                <Text style={styles.rowDetail}>
                  {previous
                    ? `${formatShort(previous.date)}: ${summarizeSets(previous.entry.sets)}`
                    : `${EQUIPMENT_LABEL[item.equipment]} · no earlier session`}
                </Text>
              </Pressable>
            );
          })}

        <Text style={styles.heading}>New {CATEGORY_LABEL[category].toLowerCase()} exercise</Text>
        <TextInput
          accessibilityLabel="New exercise name"
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={name}
        />
        <View style={styles.equipment}>
          {EQUIPMENT.map((item) => (
            <Chip
              key={item}
              label={EQUIPMENT_LABEL[item]}
              onPress={() => setEquipment(item)}
              selected={item === equipment}
            />
          ))}
        </View>
        <Button disabled={trimmed === ''} kind="primary" label="Create and add" onPress={create} />
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm, paddingBottom: space.md, paddingHorizontal: space.lg },
  list: { paddingBottom: space.xl, paddingHorizontal: space.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginBottom: space.sm,
    minHeight: MIN_HIT + 12,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  pressed: { opacity: 0.6 },
  rowName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  rowDetail: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  heading: { color: colors.textDim, fontSize: 13, fontWeight: '700', marginBottom: space.sm, marginTop: space.lg },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    minHeight: MIN_HIT,
    paddingHorizontal: space.md,
  },
  equipment: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.md },
});
