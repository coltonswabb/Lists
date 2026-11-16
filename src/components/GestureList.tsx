import { type FC, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { success, tick } from '../haptics';
import type { AddPosition } from '../store';
import { colors, type PaletteName, ROW_HEIGHT, rowColor } from '../theme';
import { RowInput } from './RowInput';
import { SwipeRow } from './SwipeRow';

const PULL_RESISTANCE = 0.6;
const PRESS_GUARD_MS = 150;
const BACK_DISTANCE = ROW_HEIGHT * 2.3;
const SPRING = { damping: 24, stiffness: 240 } as const;

type PullAction = 'none' | 'create' | 'back';

const pullLabels = {
  none: 'Pull to add',
  create: 'Release to add',
  back: 'Release to go back',
} as const satisfies Record<PullAction, string>;

export type GestureListRow = {
  id: string;
  text: string;
  done?: boolean;
  badge?: string;
};

type GestureListProps = {
  title: string;
  palette: PaletteName;
  rows: GestureListRow[];
  placeholder: string;
  emptyHint: string;
  onAdd: (text: string, at: AddPosition) => void;
  onRename: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onComplete?: (id: string) => void;
  /** Tap opens the row; long-press then renames it. Without it, tap renames. */
  onOpen?: (id: string) => void;
  onBack?: () => void;
};

export const GestureList: FC<GestureListProps> = ({
  title,
  palette,
  rows,
  placeholder,
  emptyHint,
  onAdd,
  onRename,
  onDelete,
  onComplete,
  onOpen,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [atTop, setAtTop] = useState(true);
  const [addingAt, setAddingAt] = useState<AddPosition | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pullAction, setPullAction] = useState<PullAction>('none');

  const pull = useSharedValue(0);
  const armed = useSharedValue<PullAction>('none');
  const canGoBack = onBack !== undefined;
  const busy = addingAt !== null || editingId !== null;

  // A row under the finger can still report a tap when a pull ends, so presses are ignored while pulling.
  const pulling = useRef(false);
  const beginPull = () => {
    pulling.current = true;
  };
  const press = (action: () => void) => {
    if (!pulling.current) action();
  };

  const arm = (action: PullAction) => {
    setPullAction(action);
    if (action !== 'none') tick();
  };

  const release = (action: PullAction) => {
    setTimeout(() => {
      pulling.current = false;
    }, PRESS_GUARD_MS);
    setPullAction('none');
    if (action === 'create') setAddingAt('top');
    if (action === 'back') onBack?.();
  };

  const pan = usePanGesture({
    enabled: atTop && !busy,
    activeOffsetY: 14,
    failOffsetX: [-14, 14],
    onActivate: () => {
      'worklet';
      scheduleOnRN(beginPull);
    },
    onUpdate: (event) => {
      'worklet';
      const distance = Math.max(0, event.translationY) * PULL_RESISTANCE;
      pull.value = distance;
      const next: PullAction =
        canGoBack && distance > BACK_DISTANCE ? 'back' : distance > ROW_HEIGHT ? 'create' : 'none';
      if (next !== armed.value) {
        armed.value = next;
        scheduleOnRN(arm, next);
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const action = event.canceled ? 'none' : armed.value;
      armed.value = 'none';
      // The input row takes the pulled row's place, so snap instead of springing back.
      pull.value = action === 'create' ? 0 : withSpring(0, SPRING);
      scheduleOnRN(release, action);
    },
  });

  const pullSpaceStyle = useAnimatedStyle(() => ({ height: pull.value }));
  const pullRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [0, ROW_HEIGHT], [0.3, 1], 'clamp'),
    transform: [
      { perspective: 600 },
      { rotateX: `${interpolate(pull.value, [0, ROW_HEIGHT], [-88, 0], 'clamp')}deg` },
    ],
  }));

  const finishAdd = (text: string) => {
    const at = addingAt ?? 'end';
    setAddingAt(null);
    if (!text) return;
    success();
    onAdd(text, at);
  };

  const finishEdit = (id: string, text: string) => {
    setEditingId(null);
    if (text) onRename(id, text);
  };

  const firstDone = rows.findIndex((row) => row.done);
  const activeCount = firstDone === -1 ? rows.length : firstDone;
  const totalForColor = activeCount + (addingAt ? 1 : 0);
  const colorAt = (index: number) =>
    rowColor(palette, index + (addingAt === 'top' ? 1 : 0), totalForColor);

  const input = (
    <RowInput
      color={rowColor(palette, addingAt === 'top' ? 0 : activeCount, totalForColor)}
      placeholder={placeholder}
      onDone={finishAdd}
    />
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Pressable onPress={onBack} disabled={!canGoBack} style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {canGoBack ? `‹  ${title}` : title}
        </Text>
      </Pressable>
      <GestureDetector gesture={pan}>
        <View style={styles.fill}>
          <ScrollView
            bounces={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            scrollEventThrottle={16}
            onScroll={(event) => setAtTop(event.nativeEvent.contentOffset.y <= 0)}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
          >
            <Animated.View style={[styles.pullSpace, pullSpaceStyle]}>
              <Animated.View
                style={[styles.pullRow, { backgroundColor: rowColor(palette, 0, rows.length + 1) }, pullRowStyle]}
              >
                <Text style={styles.rowText}>{pullLabels[pullAction]}</Text>
              </Animated.View>
            </Animated.View>

            {addingAt === 'top' ? input : null}

            {rows.map((row, index) => (
              <Animated.View key={row.id} layout={LinearTransition.duration(220)}>
                {editingId === row.id ? (
                  <RowInput
                    color={row.done ? colors.doneRow : colorAt(index)}
                    placeholder={placeholder}
                    initialText={row.text}
                    onDone={(text) => finishEdit(row.id, text)}
                  />
                ) : (
                  <SwipeRow
                    color={row.done ? colors.doneRow : colorAt(index)}
                    onDelete={() => onDelete(row.id)}
                    onComplete={onComplete ? () => onComplete(row.id) : undefined}
                    onPress={() => press(() => (onOpen ? onOpen(row.id) : setEditingId(row.id)))}
                    onLongPress={onOpen ? () => press(() => setEditingId(row.id)) : undefined}
                  >
                    <Text style={[styles.rowText, styles.fill, row.done && styles.doneText]} numberOfLines={1}>
                      {row.text}
                    </Text>
                    {row.badge ? <Text style={styles.badge}>{row.badge}</Text> : null}
                  </SwipeRow>
                )}
              </Animated.View>
            ))}

            {addingAt === 'end' ? input : null}

            <Pressable style={styles.tapZone} disabled={busy} onPress={() => press(() => setAddingAt('end'))}>
              {rows.length === 0 && !busy ? <Text style={styles.hint}>{emptyHint}</Text> : null}
            </Pressable>
          </ScrollView>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  title: { color: colors.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  content: { flexGrow: 1 },
  pullSpace: { justifyContent: 'flex-end', overflow: 'hidden' },
  pullRow: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 20, transformOrigin: 'bottom' },
  rowText: { color: colors.text, fontSize: 19, fontWeight: '600' },
  doneText: { color: colors.textDim, textDecorationLine: 'line-through' },
  badge: { color: colors.text, fontSize: 17, fontWeight: '700', opacity: 0.7, marginLeft: 12 },
  tapZone: { flexGrow: 1, minHeight: ROW_HEIGHT * 2, alignItems: 'center', paddingTop: 36 },
  hint: { color: colors.textDim, fontSize: 16, fontWeight: '500' },
});
