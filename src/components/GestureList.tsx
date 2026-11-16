import {
  type ComponentRef,
  type FC,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  useDerivedValue,
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
import { Roller, ROLLER_HEIGHT } from './Roller';
import { RowInput } from './RowInput';
import { LEAD_WIDTH, type Lead, RowLead } from './RowLead';
import { SWEEP_MS, SwipeRow } from './SwipeRow';

const PULL_RESISTANCE = 0.6;
const PRESS_GUARD_MS = 150;
const BACK_DISTANCE = ROW_HEIGHT * 2.3;
const PINCH_OPEN_AT = ROW_HEIGHT * 0.6;
const PINCH_CLOSE_SCALE = 0.7;
const SPRING = { damping: 24, stiffness: 240 } as const;
const UNROLL_MS = 420;
const UNCLIPPED = 100000;
/** Further than any finger can travel: makes one side of a gesture's activation range open-ended. */
const FAR = 100000;
/** Gap between one finished row sweeping away and the next, so a clear reads as a cascade. */
const SWEEP_STAGGER_MS = 70;
/** A fresh wax seal lands this long after the shelf appears, once the eye has found the scroll. */
export const STAMP_DELAY_MS = 350;
/** Average advance of the 21pt item text, used to size the strike drawn while swiping. */
const CHAR_WIDTH = 9.2;

type PullAction = 'none' | 'create' | 'back';

const pullLabels = {
  none: 'Pull to add',
  create: 'Release to add',
  back: 'Release to close',
} as const satisfies Record<PullAction, string>;

export type GestureListRow = {
  id: string;
  text: string;
  done?: boolean;
  /** A heading inside a scroll. Drawn with a painted initial; cannot be completed. */
  section?: boolean;
  badge?: string;
  /** What the row's text becomes when opened for editing, if that differs from what is shown. */
  editText?: string;
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
  /** Shown under the title, above the rows. */
  subheader?: ReactNode;
  onAdd: (texts: string[], index: number) => void;
  onRename: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onComplete?: (id: string) => void;
  /** Tap on a row's margin mark, when that should do something other than a tap on its text. */
  onPressLead?: (id: string) => void;
  /** VoiceOver's name for a tap on an item's margin mark (a heading's always folds it). */
  leadActionLabel?: string;
  /** Tap opens the row. Without it, tap renames the row. */
  onOpen?: (id: string) => void;
  onRenameTitle?: (title: string) => void;
  onBack?: () => void;
  /** Pulling up past the end of the rows clears the finished ones. Absent when there are none. */
  onPullUp?: () => void;
  /** Drawn in the margin beside "Finis" once every item is done. */
  finisArt?: ReactNode;
};

export const GestureList: FC<GestureListProps> = ({
  title,
  readout,
  variant,
  rows,
  placeholder,
  emptyHint,
  footer,
  subheader,
  onAdd,
  onRename,
  onDelete,
  onMove,
  onComplete,
  onPressLead,
  onOpen,
  onRenameTitle,
  onBack,
  onPullUp,
  finisArt,
  leadActionLabel,
}) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollView = useRef<ComponentRef<typeof NativeScrollView>>(null);
  const scrollOffset = useRef(0);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [clearArmed, setClearArmed] = useState(false);
  // While true, finished rows are primed to sweep off the sheet one after another as they are removed.
  const [sweeping, setSweeping] = useState(false);
  const extent = useRef({ content: 0, viewport: 0 });
  const updateEdges = (y: number) => {
    setAtTop(y <= 0);
    setAtBottom(y >= extent.current.content - extent.current.viewport - 2);
  };
  const [addIndex, setAddIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [pullAction, setPullAction] = useState<PullAction>('none');
  const [dragging, setDragging] = useState(false);

  const pull = useSharedValue(0);
  const armed = useSharedValue<PullAction>('none');
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  // The top roll fattens as the scroll is wound onto it.
  // It is also fat while the whole sheet is wound on: just before unrolling and just after rolling up.
  const rolledUp = useSharedValue(variant === 'scroll' ? 1 : 0);
  const wound = useDerivedValue(() => {
    const range = contentHeight.value - viewportHeight.value;
    const scrolled = range > 0 ? Math.max(0, Math.min(1, scrollY.value / range)) : 0;
    return Math.max(scrolled, rolledUp.value);
  });
  const dragFrom = useSharedValue(-1);
  const dragTo = useSharedValue(-1);
  const dragSpan = useSharedValue(1);
  const dragY = useSharedValue(0);
  const dragScrollStart = useSharedValue(0);
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

  // A heading drags the rows under it along, up to the next heading.
  const groupSizes = rows.map((row, index) => {
    if (!row.section) return 1;
    let end = index + 1;
    while (end < rowCount && !rows[end]?.section) end += 1;
    return end - index;
  });

  // As a scribe marks a new passage, the first open item under each heading begins with a red letter.
  const rubricated = rows.map((row, index) => !isShelf && !row.section && !row.done && rows[index - 1]?.section === true);

  // Where a dragged heading may land: the top, the end, or just ahead of another heading.
  // Kept stable between renders: a gesture whose configuration changes mid-touch is restarted,
  // which would cancel a pull that is under way.
  const shape = rows.map((row) => (row.section ? 'S' : 'i')).join('');
  const sectionStops = useMemo(() => {
    const sections = [...shape].map((mark) => mark === 'S');
    return sections.map((isSection, index) => {
      if (!isSection) return undefined;
      let end = index + 1;
      while (end < sections.length && !sections[end]) end += 1;
      const rest = sections.filter((_, i) => i < index || i >= end);
      const stops = [0, rest.length];
      rest.forEach((section, at) => {
        if (section) stops.push(at);
      });
      return stops;
    });
  }, [shape]);

  const itemRows = rows.filter((row) => !row.section);
  const sweepOrder = new Map(itemRows.filter((row) => row.done).map((row, position) => [row.id, position]));
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
    if (row.done) return { kind: 'done', color: colors.inkFaded };
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
  const [initialHeight] = useState(() => rowCount * ROW_HEIGHT + ROW_HEIGHT * 2);
  useEffect(() => {
    if (isShelf) return;
    play('paper');
    rolledUp.value = withTiming(0, { duration: UNROLL_MS });
    sheetHeight.value = withTiming(initialHeight, { duration: UNROLL_MS, easing: Easing.out(Easing.cubic) }, () => {
      sheetHeight.value = UNCLIPPED;
    });
  }, [isShelf, sheetHeight, rolledUp, initialHeight]);
  const sheetStyle = useAnimatedStyle(() => ({ maxHeight: sheetHeight.value }));

  /** Rolls the sheet back up onto the top rod, then leaves. */
  const leave = () => {
    if (!onBack || leaving.current) return;
    leaving.current = true;
    // Played slower and lower than the unrolling: the same paper, winding back down.
    play('paper', 0.78);
    // A long scroll takes longer to wind, up to a point.
    const duration = Math.min(480, 220 + measuredHeight.current * 0.2);
    rolledUp.set(withTiming(1, { duration }));
    sheetHeight.set(measuredHeight.current);
    sheetHeight.set(
      withTiming(0, { duration, easing: Easing.in(Easing.cubic) }, () => {
        scheduleOnRN(onBack);
      }),
    );
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

  const endPullUp = (clear: boolean) => {
    setTimeout(() => {
      pulling.current = false;
    }, PRESS_GUARD_MS);
    setClearArmed(false);
    if (!clear || !onPullUp) return;
    // Finished rows sweep away one after another; only then are they actually removed.
    const cascade = Math.max(0, sweepOrder.size - 1) * SWEEP_STAGGER_MS + SWEEP_MS;
    play('paper');
    setSweeping(true);
    setTimeout(() => {
      onPullUp();
      setSweeping(false);
    }, cascade);
  };

  const pan = usePanGesture({
    enabled: atTop && !busy && !dragging,
    maxPointers: 1,
    activeOffsetY: [-FAR, 14],
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

  // Pulling up past the last row lifts the scroll and, far enough, clears what is finished.
  const raise = useSharedValue(0);
  const raiseArmed = useSharedValue(false);
  const armClear = (armedNow: boolean) => {
    setClearArmed(armedNow);
    if (armedNow) tick();
  };
  const pullUp = usePanGesture({
    enabled: onPullUp !== undefined && atBottom && !busy && !dragging,
    maxPointers: 1,
    // Upward travel only: a pair leaves the downward side open-ended so a pull down never activates this.
    activeOffsetY: [-14, FAR],
    failOffsetX: [-14, 14],
    onActivate: () => {
      'worklet';
      scheduleOnRN(beginPull);
    },
    onUpdate: (event) => {
      'worklet';
      const distance = Math.max(0, -event.translationY) * PULL_RESISTANCE;
      raise.value = distance;
      const next = distance > ROW_HEIGHT;
      if (next !== raiseArmed.value) {
        raiseArmed.value = next;
        scheduleOnRN(armClear, next);
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const clear = !event.canceled && raiseArmed.value;
      raiseArmed.value = false;
      raise.value = withSpring(0, SPRING);
      scheduleOnRN(endPullUp, clear);
    },
  });
  const raiseStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -raise.value }] }));
  const clearHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(raise.value, [0, ROW_HEIGHT * 0.6], [0, 1], 'clamp'),
  }));

  const gesture = useSimultaneousGestures(pan, pullUp, pinch);
  const pulls = useMemo(() => [pan, pullUp], [pan, pullUp]);
  // On iOS the native scroll view otherwise claims every vertical drag before a pull can begin. With
  // bounces off it cannot move past either end, so letting both run never scrolls during a pull.
  const alongsideScroll = useMemo(() => [pan, pullUp, pinch], [pan, pullUp, pinch]);

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
    if (from === to) dragFrom.set(-1);
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
          maxFontSizeMultiplier={1.2}
        >
          {rubricated[index] ? <Text style={styles.rubric}>{row.text.charAt(0)}</Text> : null}
          {rubricated[index] ? row.text.slice(1) : row.text}
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
    if (!isShelf) return content;
    // A rolled scroll lying on the shelf: the same handles as an open one, seen end to end.
    return (
      <View style={styles.rolledScroll}>
        <View style={styles.knob} />
        <View style={styles.collar} />
        <View style={[styles.rolled, { backgroundColor: paperFor(index) }]}>{content}</View>
        <View style={styles.collar} />
        <View style={styles.knob} />
      </View>
    );
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
            <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>
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
      {subheader}
      {isShelf ? null : (
        <View style={styles.topRoller}>
          <Roller paper={colors.paperFrom} fullness={wound} />
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <View style={styles.viewport}>
          <Animated.Text style={[styles.clearHint, clearHintStyle]}>
            {clearArmed ? 'Release to clear the finished' : 'Pull to clear the finished'}
          </Animated.Text>
          <Animated.View style={[styles.fill, raiseStyle]}>
          <ScrollView
            ref={scrollView}
            simultaneousWith={alongsideScroll}
            bounces={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            scrollEnabled={!dragging}
            scrollEventThrottle={16}
            onLayout={(event) => {
              viewportHeight.value = event.nativeEvent.layout.height;
              extent.current.viewport = event.nativeEvent.layout.height;
              updateEdges(scrollOffset.current);
            }}
            onContentSizeChange={(_, height) => {
              contentHeight.value = height;
              extent.current.content = height;
              updateEdges(scrollOffset.current);
            }}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              scrollY.value = y;
              scrollOffset.current = y;
              updateEdges(y);
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
                    initialText={row.section ? `${row.text}:` : (row.editText ?? row.text)}
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
                    reorder={{ from: dragFrom, to: dragTo, span: dragSpan, dragY, scrollStart: dragScrollStart }}
                    groupSize={groupSizes[index] ?? 1}
                    stops={sectionStops[index]}
                    pulls={pulls}
                    gap={{ index: gapIndex, size: gapSize }}
                    animateLayout={!dragging}
                    sweepAfter={sweeping && row.done ? (sweepOrder.get(row.id) ?? 0) * SWEEP_STAGGER_MS : undefined}
                    onDelete={() => onDelete(row.id)}
                    onComplete={onComplete && !row.section ? () => onComplete(row.id) : undefined}
                    onPress={() => press(() => (onOpen ? onOpen(row.id) : setEditingId(row.id)))}
                    onPressLead={onPressLead ? () => press(() => onPressLead(row.id)) : undefined}
                    strikeWidth={strikeFor(row)}
                    label={[
                      row.text,
                      row.section ? 'heading' : row.done ? 'done' : '',
                      row.sealed ? 'sealed' : row.badge && !row.section && !isShelf ? row.badge.toLowerCase() : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    completeActionLabel={isShelf ? 'Seal into the chronicle' : 'Strike done'}
                    leadActionLabel={row.section ? (row.badge?.includes('···') ? 'Unfold' : 'Fold') : leadActionLabel}
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

              <Pressable
                style={[styles.tail, finished && finisArt ? styles.tailWithArt : null]}
                accessibilityRole="button"
                accessibilityLabel={isShelf ? 'Add a scroll' : 'Add a row'}
                disabled={busy}
                onPress={() => press(() => setAddIndex(endIndex))}
              >
                {rowCount === 0 && !busy ? <Text style={styles.hint}>{emptyHint}</Text> : null}
                {finished && !busy ? finisArt : null}
                {finished && !busy ? <Text style={styles.finis}>❦  Finis  ❦</Text> : null}
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
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  fill: { flex: 1 },
  // Clipped, so rows lifted by a pull-up slide under the top roll instead of over the title.
  viewport: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, height: 56 },
  back: { color: colors.onDesk, fontSize: 34, lineHeight: 36 },
  title: { color: colors.onDesk, fontFamily: fonts.display, fontSize: 30 },
  titleInput: { flex: 1, padding: 0 },
  readout: { color: colors.onDeskFaded, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1.2 },
  content: { flexGrow: 1 },
  topRoller: { zIndex: 1, marginBottom: -ROLLER_HEIGHT / 2 },
  bottomRoller: { zIndex: 1, marginTop: -ROLLER_HEIGHT / 2 },
  sheet: { marginHorizontal: 20, overflow: 'hidden', backgroundColor: colors.paperTo },
  shelf: { paddingTop: 4 },
  pullSpace: { justifyContent: 'flex-end', overflow: 'hidden' },
  pullRow: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.accent },
  pullText: { color: colors.paperFrom, fontFamily: fonts.bodyItalic, fontSize: 19 },
  rolledScroll: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: -10 },
  collar: { width: 4, height: 54, borderRadius: 1, backgroundColor: colors.gold },
  knob: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  rolled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 3,
  },
  rowText: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
  sectionText: { fontFamily: fonts.display, fontSize: 26 },
  rubric: { color: colors.accent },
  doneText: { color: colors.inkFaded, textDecorationLine: 'line-through', textDecorationColor: colors.accent },
  badge: { color: colors.inkFaded, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1, marginLeft: 12 },
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
  finis: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 19 },
  tail: { minHeight: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  tailWithArt: { paddingTop: 18, paddingBottom: 14, gap: 4 },
  tapZone: { flexGrow: 1, minHeight: ROW_HEIGHT },
  hint: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 18 },
  clearHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    textAlign: 'center',
    color: colors.onDesk,
    fontFamily: fonts.bodyItalic,
    fontSize: 18,
  },
});
