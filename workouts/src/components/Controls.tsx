import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, MIN_HIT, radius, space } from '../theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  tint?: string;
};

export const Chip: FC<ChipProps> = ({ label, selected, onPress, tint = colors.accent }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[styles.chip, selected && { backgroundColor: tint, borderColor: tint }]}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
);

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button: FC<ButtonProps> = ({ label, onPress, kind = 'quiet', disabled = false, style }) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      kind === 'primary' && styles.buttonPrimary,
      pressed && styles.pressed,
      disabled && styles.disabled,
      style,
    ]}
  >
    <Text style={[styles.buttonText, kind === 'primary' && styles.buttonTextPrimary]}>{label}</Text>
  </Pressable>
);

type NumberFieldProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  label: string;
  decimal?: boolean;
};

const parseNumber = (text: string): number | null => {
  if (text.trim() === '') return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const NumberField: FC<NumberFieldProps> = ({ value, onChange, placeholder, label, decimal = false }) => {
  const [text, setText] = useState(value === null ? '' : String(value));
  const handleChange = (next: string) => {
    setText(next);
    onChange(parseNumber(next));
  };
  return (
    <TextInput
      accessibilityLabel={label}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      selectTextOnFocus
      style={styles.numberField}
      value={text}
    />
  );
};

type SheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const Sheet: FC<SheetProps> = ({ title, visible, onClose, children }) => (
  <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
    <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Button label="Close" onPress={onClose} />
      </View>
      {children}
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  chip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: space.md,
  },
  chipText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#0e0f11' },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: MIN_HIT,
    paddingHorizontal: space.lg,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  buttonTextPrimary: { color: '#0e0f11' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
  numberField: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    minHeight: MIN_HIT,
    minWidth: 0,
    paddingHorizontal: space.md,
    textAlign: 'center',
  },
  sheet: { backgroundColor: colors.background, flex: 1 },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.sm,
  },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
});
