import { useState } from 'react';
import type { FC } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { Suggestion } from '../catalog';
import type { NewExercise } from '../store';
import { categoryColor, colors, MIN_HIT, radius, space } from '../theme';
import { CATEGORIES, CATEGORY_LABEL, EQUIPMENT, EQUIPMENT_LABEL } from '../types';
import type { Category, Days, Equipment, Exercise } from '../types';
import { Button, Chip, SectionLabel, Sheet } from './Controls';
import { Finder } from './Finder';

type ExercisePickerProps = {
  visible: boolean;
  date: string;
  exercises: Exercise[];
  days: Days;
  onPick: (exerciseId: string) => void;
  onCreate: (exercise: NewExercise) => void;
  onClose: () => void;
};

export const ExercisePicker: FC<ExercisePickerProps> = ({ visible, date, exercises, days, onPick, onCreate, onClose }) => (
  <Sheet onClose={onClose} title="Add a lift" visible={visible}>
    <Finder
      date={date}
      days={days}
      exercises={exercises}
      footer={<CustomExercise onCreate={onCreate} />}
      ideaAction={{ label: 'Add', onPress: (idea: Suggestion) => onCreate(idea) }}
      ownedAction={{ label: 'Add', onPress: onPick }}
    />
  </Sheet>
);

const CustomExercise: FC<{ onCreate: (exercise: NewExercise) => void }> = ({ onCreate }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('push');
  const [equipment, setEquipment] = useState<Equipment>('centr3');
  const trimmed = name.trim();

  const create = () => {
    onCreate({ name: trimmed, category, equipment, muscles: [] });
    setName('');
  };

  return (
    <View>
      <SectionLabel>Not listed? Make your own</SectionLabel>
      <TextInput
        accessibilityLabel="New exercise name"
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        value={name}
      />
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
      <View style={styles.chips}>
        {EQUIPMENT.map((item) => (
          <Chip
            key={item}
            label={EQUIPMENT_LABEL[item]}
            onPress={() => setEquipment(item)}
            selected={item === equipment}
            tint={colors.sunset}
          />
        ))}
      </View>
      <Button disabled={trimmed === ''} kind="primary" label="Create and add" onPress={create} style={styles.create} />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    minHeight: MIN_HIT,
    paddingHorizontal: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  create: { marginTop: space.lg },
});
