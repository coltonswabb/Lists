import { type FC, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  GestureDetector,
  ScrollView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { success, thud, tick } from '../haptics';
import { colors, fonts, type PaletteName, ROW_HEIGHT, rowColor } from '../theme';
import { Initial, type MarkerKind } from './Initial';
import { Roller } from './Roller';
import { RowInput } from './RowInput';
import { SwipeRow } from './SwipeRow';

const PULL_RESISTANCE = 0.6;
const PRESS_GUARD_MS = 150;
const BACK_DISTANCE = ROW_HEIGHT * 2.3;
const PINCH_OPEN_AT = ROW_HEIGHT * 0.6;
const PINCH_CLOSE_SCALE = 0.7;
const SPRING = { damping: 24, stiffness: 240 } as const;
const UNROLL_MS = 420;
const UNCLIPPED = 100000;

type PullAction = 'none' | 'create' | 'back';

const pullLabels = {
  none: 'Pull to inscribe',
  create: 'Release to inscribe',
  back: 'Release to return',
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
  marker: MarkerKind;
  rows: GestureListRow[];
  placeholder: string;
  emptyHint: string;
  footer?: ReactNode;
  onAdd: (texts: string[], index: number) => void;
  onRename: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onComplete?: (id: string) => void;
  /** Tap opens the row. Without it, tap renames the row. */
  onOpen?: (id: string) => void;
  onRenameTitle?: (title: string) => void;
  onBack?: () => void;
};

export const GestureList: FC<GestureListProps> = ({
  title,
  palette,
  marker,
  rows,
  placeholder,
  emptyHint,
  footer,
  onAdd,
  onRename,
  onDelete,
  onMove,
  onComplete,
  onOpen,
  onRenameTitle,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [atTop, setAtTop] = useState(true);
  const [addIndex, setAddIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [pullAction, setPullAction] = useState<PullAction>('none');
  const [dragging, setDragging] = useState(false);

  const pull = useSharedValue(0);
  const armed = useSharedValue<PullAction>('none');
  const scrollY = useSharedValue(0);
  const dragFrom = useSharedValue(-1);
  const dragTo = useSharedValue(-1);
  const gapIndex = useSharedValue(-1);
  const gapSize = useSharedValue(0);

  const canGoBack = onBack !== undefined;
  const busy = addIndex !== null || editingId !== null || titleDraft !== null;
  const firstDone = rows.findIndex((row) => row.done);
  const activeCount = firstDone === -1 ? rows.length : firstDone;
  const order = rows.map((row) => row.id).join('|');

  // Rows keep their drag offsets until the new order has rendered, so the drop doesn't flicker.
  useLayoutEffect(() => {
    dragFrom.value = -1;
  }, [order, dragFrom]);

  // A row under the finger can still report a tap when a pull ends, so presses are ignored while pulling.
  const pulling = useRef(false);
  const beginPull = () => {
    pulling.current = true;
  };
  const press = (action: () => void) => {
    if (!pulling.current && !busy) action();
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
    if (action === 'create') setAddIndex(0);
    if (action === 'back') onBack?.();
  };

  const pan = usePanGesture({
    enabled: atTop && !busy && !dragging,
    maxPointers: 1,
    activeOffsetY: 14,
    failOffsetX: [-14, 14],
    onActivate: () => {
      'worklet';
      scheduleOnRN(beginPull);
    },
    onUpdate: (event) => {
      'worklet';
      if (dragFrom.value >= 0) return;
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

  const openGap = (index: number) => {
    thud();
    setAddIndex(index);
  };
  const pinchBack = () => {
    thud();
    onBack?.();
  };

  // Pinch apart opens a gap between two rows for a new one; pinch together leaves the list.
  const pinch = usePinchGesture({
    enabled: !busy && !dragging,
    onActivate: (event) => {
      'worklet';
      const row = Math.round((event.focalY + scrollY.value) / ROW_HEIGHT);
      gapIndex.value = Math.max(0, Math.min(activeCount, row));
    },
    onUpdate: (event) => {
      'worklet';
      gapSize.value = Math.max(0, Math.min(ROW_HEIGHT, (event.scale - 1) * ROW_HEIGHT * 1.4));
    },
    onDeactivate: (event) => {
      'worklet';
      const index = gapIndex.value;
      if (!event.canceled && index >= 0 && gapSize.value > PINCH_OPEN_AT) {
        gapSize.value = 0;
        gapIndex.value = -1;
        scheduleOnRN(openGap, index);
        return;
      }
      gapSize.value = withTiming(0, { duration: 150 }, () => {
        gapIndex.value = -1;
      });
      if (!event.canceled && canGoBack && event.scale < PINCH_CLOSE_SCALE) scheduleOnRN(pinchBack);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  // Opening a screen unrolls the sheet from the top roller; afterwards its height is unconstrained.
  const sheetHeight = useSharedValue(0);
  const initialHeight = useRef(rows.length * ROW_HEIGHT + ROW_HEIGHT * 2).current;
  useEffect(() => {
    sheetHeight.value = withTiming(initialHeight, { duration: UNROLL_MS, easing: Easing.out(Easing.cubic) }, () => {
      sheetHeight.value = UNCLIPPED;
    });
  }, [sheetHeight, initialHeight]);
  const sheetStyle = useAnimatedStyle(() => ({ maxHeight: sheetHeight.value }));

  // Pulling draws fresh paper out from under the roller.
  const pullSpaceStyle = useAnimatedStyle(() => ({ height: pull.value }));
  const pullRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [0, ROW_HEIGHT], [0.4, 1], 'clamp'),
  }));

  // Each finished line becomes a row and the input moves below it, ready for the next one.
  const addLines = (lines: string[]) => {
    if (addIndex === null) return;
    success();
    onAdd(lines, addIndex);
    setAddIndex(addIndex + lines.length);
  };

  const endAdd = (remaining: string) => {
    if (addIndex !== null && remaining) {
      success();
      onAdd([remaining], addIndex);
    }
    setAddIndex(null);
  };

  const endEdit = (id: string, text: string) => {
    setEditingId(null);
    if (text) onRename(id, text);
  };

  const endTitleEdit = () => {
    const next = titleDraft?.trim();
    setTitleDraft(null);
    if (next && next !== title) onRenameTitle?.(next);
  };

  const startDrag = () => {
    thud();
    setDragging(true);
  };

  const drop = (from: number, to: number) => {
    if (from === to) dragFrom.value = -1;
    else onMove(from, to);
    // Layout animations stay off until the reordered rows have settled.
    setTimeout(() => setDragging(false), 80);
  };

  const colorTotal = activeCount + (addIndex === null ? 0 : 1);
  const colorAt = (index: number) =>
    rowColor(palette, index + (addIndex !== null && index >= addIndex ? 1 : 0), colorTotal);

  const input =
    addIndex === null ? null : (
      <RowInput
        key="new-row"
        color={rowColor(palette, addIndex, colorTotal)}
        marker={marker}
        placeholder={placeholder}
        onLines={addLines}
        onEnd={endAdd}
      />
    );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable onPress={onBack} hitSlop={14} accessibilityRole="button" accessibilityLabel="Back to lists">
            <Text style={styles.back}>‹</Text>
          </Pressable>
        ) : null}
        {titleDraft === null ? (
          <Pressable style={styles.fill} disabled={!onRenameTitle || busy} onPress={() => setTitleDraft(title)}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            autoFocus
            value={titleDraft}
            onChangeText={setTitleDraft}
            onSubmitEditing={endTitleEdit}
            onBlur={endTitleEdit}
            returnKeyType="done"
            selectionColor={colors.gold}
            style={[styles.title, styles.titleInput]}
          />
        )}
      </View>
      <View style={styles.topRoller}>
        <Roller />
      </View>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          <ScrollView
            bounces={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            scrollEnabled={!dragging}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              scrollY.value = y;
              setAtTop(y <= 0);
            }}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
          >
            <Animated.View style={[styles.sheet, sheetStyle]}>
            <Animated.View style={[styles.pullSpace, pullSpaceStyle]}>
              <Animated.View
                style={[styles.pullRow, { backgroundColor: rowColor(palette, 0, activeCount + 1) }, pullRowStyle]}
              >
                <Text style={styles.pullText}>{pullLabels[pullAction]}</Text>
              </Animated.View>
            </Animated.View>

            {rows.flatMap((row, index) => [
              addIndex === index ? input : null,
              editingId === row.id ? (
                <RowInput
                  key={row.id}
                  color={colorAt(index)}
                  marker={marker}
                  placeholder={placeholder}
                  initialText={row.text}
                  onEnd={(text) => endEdit(row.id, text)}
                />
              ) : (
                <SwipeRow
                  key={row.id}
                  color={row.done ? colors.parchmentShade : colors.parchment}
                  index={index}
                  reorderLimit={activeCount}
                  reorder={{ from: dragFrom, to: dragTo }}
                  gap={{ index: gapIndex, size: gapSize }}
                  animateLayout={!dragging}
                  onDelete={() => onDelete(row.id)}
                  onComplete={onComplete ? () => onComplete(row.id) : undefined}
                  onPress={() => press(() => (onOpen ? onOpen(row.id) : setEditingId(row.id)))}
                  onDragStart={startDrag}
                  onDrop={drop}
                >
                  <Initial text={row.text} pigment={colorAt(index)} kind={marker} faded={row.done} />
                  <Text style={[styles.rowText, styles.fill, row.done && styles.doneText]} numberOfLines={1}>
                    {row.text}
                  </Text>
                  {row.badge ? <Text style={styles.badge}>{row.badge}</Text> : null}
                </SwipeRow>
              ),
            ])}

            {addIndex !== null && addIndex >= rows.length ? input : null}

            {footer}

            <Pressable style={styles.tail} disabled={busy} onPress={() => press(() => setAddIndex(activeCount))}>
              {rows.length === 0 && !busy ? <Text style={styles.hint}>{emptyHint}</Text> : null}
            </Pressable>
            </Animated.View>
            <Roller />
            <Pressable style={styles.tapZone} disabled={busy} onPress={() => press(() => setAddIndex(activeCount))} />
          </ScrollView>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, height: 56 },
  back: { color: colors.gold, fontSize: 34, lineHeight: 36 },
  title: { color: colors.parchment, fontFamily: fonts.display, fontSize: 30 },
  titleInput: { flex: 1, padding: 0 },
  content: { flexGrow: 1 },
  topRoller: { zIndex: 1, marginBottom: -8 },
  sheet: { marginHorizontal: 18, overflow: 'hidden', backgroundColor: colors.parchment },
  tail: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pullSpace: { justifyContent: 'flex-end', overflow: 'hidden' },
  pullRow: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 16 },
  pullText: { color: colors.onPigment, fontFamily: fonts.bodyItalic, fontSize: 21 },
  rowText: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
  doneText: { color: colors.inkFaded, textDecorationLine: 'line-through', textDecorationColor: colors.rubric },
  badge: { color: colors.rubric, fontFamily: fonts.display, fontSize: 22, marginLeft: 12 },
  tapZone: { flexGrow: 1, minHeight: ROW_HEIGHT },
  hint: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 18 },
});
