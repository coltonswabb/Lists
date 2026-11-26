import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, MIN_HIT, radius, space, SUNSET } from '../theme';

const ACROSS = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } } as const;

/** The sunset band that marks anything primary. */
export const Sunset: FC<{ style?: StyleProp<ViewStyle>; children?: ReactNode }> = ({ style, children }) => (
  <LinearGradient colors={SUNSET} end={ACROSS.end} start={ACROSS.start} style={style}>
    {children}
  </LinearGradient>
);

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
    style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled, style]}
  >
    {kind === 'primary' ? <Sunset style={styles.buttonFill} /> : null}
    <Text style={[styles.buttonText, kind === 'primary' && styles.buttonTextPrimary]}>{label}</Text>
  </Pressable>
);

type NumberFieldProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  label: string;
  decimal?: boolean;
  /** Colours the number, to show which rep zone it falls in. */
  tint?: string;
};

const parseNumber = (text: string): number | null => {
  if (text.trim() === '') return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const NumberField: FC<NumberFieldProps> = ({ value, onChange, placeholder, label, decimal = false, tint }) => {
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
      style={[styles.numberField, tint ? { borderColor: tint, color: tint } : null]}
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

/** Small capital heading above a section. */
export const SectionLabel: FC<{ children: ReactNode; color?: string }> = ({ children, color = colors.textDim }) => (
  <Text style={[styles.sectionLabel, { color }]}>{children}</Text>
);

const styles = StyleSheet.create({
  chip: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: space.md,
  },
  chipText: { color: colors.textDim, fontFamily: fonts.label, fontSize: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  chipTextSelected: { color: colors.ink },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: MIN_HIT,
    overflow: 'hidden',
    paddingHorizontal: space.lg,
  },
  buttonFill: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  buttonText: { color: colors.accent, fontFamily: fonts.heading, fontSize: 19, letterSpacing: 1, textTransform: 'uppercase' },
  buttonTextPrimary: { color: colors.ink },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.35 },
  numberField: {
    backgroundColor: colors.surfaceRaised,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    color: colors.text,
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
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
  sheetTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 30, textTransform: 'uppercase' },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: space.sm,
    marginTop: space.lg,
    textTransform: 'uppercase',
  },
});
