import { type FC, useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Undo } from '../store';
import { useTheme } from '../ThemeContext';
import { type Palette, fonts } from '../theme';

const VISIBLE_MS = 4000;

type UndoToastProps = {
  undo: Undo | null;
  onUndo: () => void;
  onDismiss: () => void;
  /** Extra distance from the bottom, to clear anything pinned there. */
  offset: number;
};

export const UndoToast: FC<UndoToastProps> = ({ undo, onUndo, onDismiss, offset }) => {
  const { styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [undo, onDismiss]);

  if (!undo) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(180)}
      style={[styles.toast, { bottom: insets.bottom + 16 + offset }]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {undo.label}
      </Text>
      <Pressable onPress={onUndo} hitSlop={12}>
        <Text style={styles.action}>Restore</Text>
      </Pressable>
    </Animated.View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: colors.parchment,
  },
  label: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 18 },
  action: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 18 },
});
