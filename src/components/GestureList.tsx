import { type ComponentRef, type FC, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView as NativeScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
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
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { success, thud, tick } from '../haptics';
import { play } from '../sounds';
import { useTheme } from '../ThemeContext';
import { accentAt, fonts, type Palette, paperAt, roman, ROW_HEIGHT } from '../theme';
import { PaperOverlay } from './PaperOverlay';
import { Roller } from './Roller';
import { RowInput } from './RowInput';
import { LEAD_WIDTH, type Lead, RowLead } from './RowLead';
import { SwipeRow } from './SwipeRow';

const PULL_RESISTANCE = 0.6;
const PRESS_GUARD_MS = 150;
const BACK_DISTANCE = ROW_HEIGHT * 2.3;
const PINCH_OPEN_AT = ROW_HEIGHT * 0.6;
const PINCH_CLOSE_SCALE = 0.7;
const SPRING = { damping: 24, stiffness: 240 } as const;
const UNROLL_MS = 420;
const ROLL_UP_MS = 240;
const UNCLIPPED = 100000;
/** A fresh wax seal lands this long after the shelf appears, once the eye has found the scroll. */
export const STAMP_DELAY_MS = 350;
/** Average advance of the 18pt item text, used to size the strike drawn while swiping. */
const CHAR_WIDTH = 9.4;

type PullAction = 'none' | 'create' | 'back';

const pullLabels = {
  none: 'PULL TO ADD',
  create: 'RELEASE TO ADD',
  back: 'RELEASE TO CLOSE',
} as const satisfies Record<PullAction, string>;

export type GestureListRow = {
  id: string;
  text: string;
  done?: boolean;
  /** A heading inside a scroll. Drawn with a painted initial; cannot be completed. */
  section?: boolean;
  badge?: string;
  /** Draws the badge in the accent colour: a reward mark rather than a count. */
  badgeAccent?: boolean;
  /** Shelf only: stamps the scroll with a wax seal in place of its badge. */
  sealed?: boolean;
  /** The seal was just earned: press it on with a stamp instead of simply showing it. */
  stamp?: boolean;
};

type GestureListProps = {
  title: string;
  /** Small status label beside the title, in the manner of an instrument's display. */
  readout: string;
  /**
   * `shelf` shows every row as a rolled-up scroll lying on the desk.
   * `scroll` shows the rows as lines on one unrolled sheet.
   */
  variant: 'shelf' | 'scroll';
  rows: GestureListRow[];
  placeholder: string;
  emptyHint: string;
  footer?: ReactNode;
  onAdd: (texts: string[], index: number) => void;
  onRename: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onComplete?: (id: string) => void;
  /** Tap on a row's margin mark, for rows where that differs from a tap on its text. */
  onPressLead?: (id: string) => void;
  /** Tap opens the row. Without it, tap renames the row. */
  onOpen?: (id: string) => void;
  onRenameTitle?: (title: string) => void;
  onBack?: () => void;
};

export const GestureList: FC<GestureListProps> = ({
  title,
  readout,
  variant,
  rows,
  placeholder,
  emptyHint,
  footer,
  onAdd,
  onRename,
  onDelete,
  onMove,
  onComplete,
  onPressLead,
  onOpen,
  onRenameTitle,
  onBack,
}) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollView = useRef<ComponentRef<typeof NativeScrollView>>(null);
  const scrollOffset = useRef(0);
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

  const isShelf = variant === 'shelf';
  const canGoBack = onBack !== undefined;
  const busy = addIndex !== null || editingId !== null || titleDraft !== null;
  const rowCount = rows.length;
  const order = rows.map((row) => row.id).join('|');

  // New rows from a tap land after the last unfinished row, ahead of any finished ones at the bottom.
  let endIndex = rowCount;
  while (endIndex > 0 && rows[endIndex - 1]?.done) endIndex -= 1;

  // Items are numbered within their section.
  const numbers: number[] = [];
  let count = 0;
  rows.forEach((row, index) => {
    count = row.section ? 0 : count + 1;
    numbers[index] = count;
  });

  const itemRows = rows.filter((row) => !row.section);
  const finished = !isShelf && itemRows.length > 0 && itemRows.every((row) => row.done);

  // Sheet margins, row padding and the margin mark, on both sides of the text.
  const textRoom = screenWidth - 40 - 32 - LEAD_WIDTH - 12;
  const strikeFor = (row: GestureListRow) =>
    isShelf || row.section || row.done ? 0 : Math.min(textRoom, row.text.length * CHAR_WIDTH);

  const nudgeScroll = (direction: -1 | 1) => {
    scrollView.current?.scrollTo({ y: Math.max(0, scrollOffset.current + direction * ROW_HEIGHT * 1.5), animated: true });
  };

  const leadFor = (row: GestureListRow, index: number): Lead => {
    if (isShelf) return { kind: 'initial', text: row.text, pigment: colors.ink, letter: colors.paperFrom };
    if (row.section) return { kind: 'initial', text: row.text, pigment: colors.accent, letter: colors.paperFrom };
    if (row.done) return { kind: 'label', label: '✓', color: colors.inkFaded };
    return { kind: 'label', label: roman(numbers[index] ?? 0), color: accentAt(colors, index, rowCount) };
  };

  // While typing, a trailing colon previews the row as a section.
  const draftLead = (text: string): Lead => {
    const trimmed = text.trim();
    if (isShelf) return { kind: 'initial', text: trimmed, pigment: colors.ink, letter: colors.paperFrom };
    if (trimmed.length > 1 && (trimmed.endsWith(':') || trimmed.startsWith('#'))) {
      return { kind: 'initial', text: trimmed.replace(/^#+\s*/, ''), pigment: colors.accent, letter: colors.paperFrom };
    }
    return { kind: 'label', label: '+', color: colors.accent };
  };

  // Rows keep their drag offsets until the new order has rendered, so the drop doesn't flicker.
  useLayoutEffect(() => {
    dragFrom.value = -1;
  }, [order, dragFrom]);

  // Opening a scroll unrolls its sheet from the top rod; afterwards its height is unconstrained.
  const sheetHeight = useSharedValue(isShelf ? UNCLIPPED : 0);
  const measuredHeight = useRef(0);
  const leaving = useRef(false);
  const initialHeight = useRef(rowCount * ROW_HEIGHT + ROW_HEIGHT * 2).current;
  useEffect(() => {
    if (isShelf) return;
    play('paper');
    sheetHeight.value = withTiming(initialHeight, { duration: UNROLL_MS, easing: Easing.out(Easing.cubic) }, () => {
      sheetHeight.value = UNCLIPPED;
    });
  }, [isShelf, sheetHeight, initialHeight]);
  const sheetStyle = useAnimatedStyle(() => ({ maxHeight: sheetHeight.value }));

  /** Rolls the sheet back up onto the top rod, then leaves. */
  const leave = () => {
    if (!onBack || leaving.current) return;
    leaving.current = true;
    play('paper');
    sheetHeight.value = measuredHeight.current;
    sheetHeight.value = withTiming(0, { duration: ROLL_UP_MS, easing: Easing.in(Easing.cubic) }, () => {
      scheduleOnRN(onBack);
    });
  };

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
    if (action === 'back') leave();
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
    leave();
  };

  // Pinch apart opens a gap between two rows for a new one; pinch together closes the scroll.
  const pinch = usePinchGesture({
    enabled: !busy && !dragging,
    onActivate: (event) => {
      'worklet';
      const row = Math.round((event.focalY + scrollY.value) / ROW_HEIGHT);
      gapIndex.value = Math.max(0, Math.min(rowCount, row));
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

  // Pulling draws fresh paper out from under the rod.
  const pullSpaceStyle = useAnimatedStyle(() => ({ height: pull.value }));
  const pullRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [0, ROW_HEIGHT], [0.4, 1], 'clamp'),
  }));

  // Each finished line becomes a row and the input moves below it, ready for the next one.
  const addLines = (lines: string[]) => {
    if (addIndex === null) return;
    success();
    play('quill');
    onAdd(lines, addIndex);
    setAddIndex(addIndex + lines.length);
  };

  const endAdd = (remaining: string) => {
    if (addIndex !== null && remaining) {
      success();
      play('quill');
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

  // The paper shades down the scroll; a row being written takes its place in that run like any other.
  const paperTotal = rowCount + (addIndex === null ? 0 : 1);
  const paperFor = (index: number, done = false) =>
    paperAt(colors, index + (addIndex !== null && index >= addIndex ? 1 : 0), paperTotal, done);

  const input =
    addIndex === null ? null : (
      <RowInput
        key="new-row"
        leadFor={draftLead}
        paper={paperAt(colors, addIndex, paperTotal)}
        placeholder={placeholder}
        rolled={isShelf}
        onLines={addLines}
        onEnd={endAdd}
      />
    );

  const rowContent = (row: GestureListRow, index: number) => {
    const content = (
      <>
        <RowLead lead={leadFor(row, index)} />
        <Text
          style={[styles.rowText, styles.fill, row.section && styles.sectionText, row.done && styles.doneText]}
          numberOfLines={1}
        >
          {row.text}
        </Text>
        {row.sealed ? (
          <Animated.View
            style={styles.seal}
            entering={row.stamp ? ZoomIn.delay(STAMP_DELAY_MS).springify().damping(11).stiffness(220) : undefined}
          >
            <Text style={styles.sealMark}>✓</Text>
          </Animated.View>
        ) : row.badge ? (
          <Text style={[styles.badge, row.badgeAccent && styles.badgeAccent]}>{row.badge}</Text>
        ) : null}
      </>
    );
    return isShelf ? <View style={[styles.rolled, { backgroundColor: paperFor(index) }]}>{content}</View> : content;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable onPress={leave} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close scroll">
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
            selectionColor={colors.accent}
            style={[styles.title, styles.titleInput]}
          />
        )}
        <Text style={styles.readout}>{readout}</Text>
      </View>
      {isShelf ? null : (
        <View style={styles.topRoller}>
          <Roller paper={colors.paperFrom} />
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          <ScrollView
            ref={scrollView}
            bounces={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            scrollEnabled={!dragging}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              scrollY.value = y;
              scrollOffset.current = y;
              setAtTop(y <= 0);
            }}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
          >
            <Animated.View
              style={[isShelf ? styles.shelf : styles.sheet, sheetStyle]}
              onLayout={(event) => {
                measuredHeight.current = event.nativeEvent.layout.height;
              }}
            >
              <Animated.View style={[styles.pullSpace, pullSpaceStyle]}>
                <Animated.View style={[styles.pullRow, pullRowStyle]}>
                  <Text style={styles.pullText}>{pullLabels[pullAction]}</Text>
                </Animated.View>
              </Animated.View>

              {rows.flatMap((row, index) => [
                addIndex === index ? input : null,
                editingId === row.id ? (
                  <RowInput
                    key={row.id}
                    leadFor={draftLead}
                    paper={paperFor(index, row.done)}
                    placeholder={placeholder}
                    initialText={row.section ? `${row.text}:` : row.text}
                    rolled={isShelf}
                    onEnd={(text) => endEdit(row.id, text)}
                  />
                ) : (
                  <SwipeRow
                    key={row.id}
                    color={isShelf ? colors.desk : paperFor(index, row.done)}
                    index={index}
                    rowCount={rowCount}
                    draggable={!row.done}
                    reorder={{ from: dragFrom, to: dragTo }}
                    gap={{ index: gapIndex, size: gapSize }}
                    animateLayout={!dragging}
                    onDelete={() => onDelete(row.id)}
                    onComplete={onComplete && !row.section ? () => onComplete(row.id) : undefined}
                    onPress={() => press(() => (onOpen ? onOpen(row.id) : setEditingId(row.id)))}
                    onPressLead={onPressLead && row.section ? () => press(() => onPressLead(row.id)) : undefined}
                    strikeWidth={strikeFor(row)}
                    scrollY={scrollY}
                    onEdge={nudgeScroll}
                    onDragStart={startDrag}
                    onDrop={drop}
                  >
                    {rowContent(row, index)}
                  </SwipeRow>
                ),
              ])}

              {addIndex !== null && addIndex >= rowCount ? input : null}

              {footer}

              <Pressable style={styles.tail} disabled={busy} onPress={() => press(() => setAddIndex(endIndex))}>
                {rowCount === 0 && !busy ? <Text style={styles.hint}>{emptyHint}</Text> : null}
                {finished && !busy ? <Text style={styles.finis}>❦  FINIS  ❦</Text> : null}
              </Pressable>
              {isShelf ? null : <PaperOverlay />}
            </Animated.View>
            {isShelf ? null : (
              <View style={styles.bottomRoller}>
                <Roller paper={colors.paperTo} />
              </View>
            )}
            <Pressable style={styles.tapZone} disabled={busy} onPress={() => press(() => setAddIndex(endIndex))} />
          </ScrollView>
        </View>
      </GestureDetector>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, height: 56 },
  back: { color: colors.onDesk, fontSize: 34, lineHeight: 36 },
  title: { color: colors.onDesk, fontFamily: fonts.display, fontSize: 30 },
  titleInput: { flex: 1, padding: 0 },
  readout: { color: colors.onDeskFaded, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2 },
  content: { flexGrow: 1 },
  topRoller: { zIndex: 1, marginBottom: -12 },
  bottomRoller: { zIndex: 1, marginTop: -12 },
  sheet: { marginHorizontal: 20, overflow: 'hidden', backgroundColor: colors.paperTo },
  shelf: { paddingTop: 4 },
  pullSpace: { justifyContent: 'flex-end', overflow: 'hidden' },
  pullRow: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.accent },
  pullText: { color: colors.paperFrom, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1.6 },
  rolled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderColor: colors.gold,
  },
  rowText: { color: colors.ink, fontSize: 18, fontWeight: '500' },
  sectionText: { fontFamily: fonts.display, fontSize: 26, fontWeight: '400' },
  doneText: { color: colors.inkFaded, textDecorationLine: 'line-through', textDecorationColor: colors.accent },
  badge: { color: colors.inkFaded, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, marginLeft: 12 },
  badgeAccent: { color: colors.accent, fontSize: 18 },
  seal: {
    width: 30,
    height: 30,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.remove,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  sealMark: { color: colors.onAction, fontSize: 14, fontWeight: '700' },
  finis: { color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2 },
  tail: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  tapZone: { flexGrow: 1, minHeight: ROW_HEIGHT },
  hint: { color: colors.inkFaded, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2 },
});
