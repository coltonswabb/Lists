import { useState } from 'react';
import type { FC } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, MIN_HIT, radius, space } from '../theme';
import { Button, Chip, NumberField, SectionLabel, Sheet } from './Controls';

type CardioSheetProps = {
  visible: boolean;
  onAdd: (kind: string, minutes: number) => void;
  onClose: () => void;
};

const KINDS = ['Cycling', 'Walking', 'Running', 'Hiking', 'Rowing', 'Swimming'];

const QUICK_MINUTES = [20, 30, 45, 60, 90];

export const CardioSheet: FC<CardioSheetProps> = ({ visible, onAdd, onClose }) => {
  const [kind, setKind] = useState('Cycling');
  const [minutes, setMinutes] = useState<number | null>(60);
  const trimmed = kind.trim();

  return (
    <Sheet onClose={onClose} title="Add cardio" visible={visible}>
      <View style={styles.body}>
        <SectionLabel>What</SectionLabel>
        <View style={styles.chips}>
          {KINDS.map((item) => (
            <Chip key={item} label={item} onPress={() => setKind(item)} selected={item === kind} tint={colors.cardio} />
          ))}
        </View>
        <TextInput
          accessibilityLabel="Cardio type"
          onChangeText={setKind}
          placeholder="Or type your own"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={kind}
        />

        <SectionLabel>Minutes</SectionLabel>
        <View style={styles.chips}>
          {QUICK_MINUTES.map((item) => (
            <Chip
              key={item}
              label={String(item)}
              onPress={() => setMinutes(item)}
              selected={item === minutes}
              tint={colors.cardio}
            />
          ))}
        </View>
        <View style={styles.minutes}>
          <NumberField key={minutes ?? 'empty'} label="Minutes" onChange={setMinutes} placeholder="min" value={minutes} />
        </View>

        <Button
          disabled={trimmed === '' || !minutes}
          kind="primary"
          label="Add cardio"
          onPress={() => onAdd(trimmed, minutes ?? 0)}
        />
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    minHeight: MIN_HIT,
    paddingHorizontal: space.md,
  },
  minutes: { flexDirection: 'row', marginBottom: space.xl },
});
