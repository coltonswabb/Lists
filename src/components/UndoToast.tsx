import { type FC, useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Undo } from '../store';
import { colors } from '../theme';

const VISIBLE_MS = 5000;

type UndoToastProps = {
  undo: Undo | null;
  onUndo: () => void;
  onDismiss: () => void;
};

export const UndoToast: FC<UndoToastProps> = ({ undo, onUndo, onDismiss }) => {
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
      style={[styles.toast, { bottom: insets.bottom + 16 }]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {undo.label}
      </Text>
      <Pressable onPress={onUndo} hitSlop={12}>
        <Text style={styles.action}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2a2a33',
  },
  label: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  action: { color: '#9db4ff', fontSize: 15, fontWeight: '700' },
});
