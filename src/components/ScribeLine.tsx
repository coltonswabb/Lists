import { type FC, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { drawings } from '../art';
import { listen } from '../scribe';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';
import { LineArt } from './LineArt';

/** How long a remark stays once it has been written out. */
const REMARK_MS = 2600;
/** The scribe's hand: one letter every so often. Quick enough that a full line takes about a second. */
const LETTER_MS = 22;
/** A line is bright while it is being written and for this long after, then sinks back into the desk. */
const BRIGHT_MS = 1100;
const SETTLE_MS = 900;
const RESTING = 0.5;

type ScribeLineProps = {
  /** What the scribe says when nothing has just happened. May be empty. */
  standing: string;
  onPress?: () => void;
};

type WrittenProps = {
  text: string;
  /** Called once the last letter is down. */
  onWritten?: () => void;
};

/**
 * One line, written out letter by letter in fresh ink that then dries to the desk's quiet tone. The
 * whole line is laid out from the start, with the unwritten part unseen, so nothing shifts as it grows.
 */
const Written: FC<WrittenProps> = ({ text, onWritten }) => {
  const { colors, styles } = useTheme(makeStyles);
  const still = useReducedMotion();
  const quill = drawings.quill;
  const [shown, setShown] = useState(still ? text.length : 0);
  const ink = useSharedValue(1);
  const hand = useSharedValue(0);

  useEffect(() => {
    const writing = still ? 0 : text.length * LETTER_MS;
    // Counted here, not by a clock: timers run late under load, and the line must always be finished.
    let count = still ? text.length : 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const finish = () => {
      if (timer) clearInterval(timer);
      onWritten?.();
    };
    if (still) finish();
    else {
      timer = setInterval(() => {
        count += 1;
        setShown(count);
        if (count >= text.length) finish();
      }, LETTER_MS);
    }
    ink.value = withDelay(writing + BRIGHT_MS, withTiming(RESTING, { duration: SETTLE_MS }));
    if (!still) {
      // The quill scratches back and forth for as long as the line takes to write.
      const strokes = Math.max(1, Math.round(writing / 160));
      hand.value = withRepeat(
        withSequence(withTiming(1, { duration: 80, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 80 })),
        strokes,
      );
    }
    return () => {
      if (timer) clearInterval(timer);
    };
    // Written once, when the line is first shown; a new line is a new instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inkStyle = useAnimatedStyle(() => ({ opacity: ink.value }));
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hand.value * 2.5 }, { translateY: hand.value * -1.5 }, { rotate: `${hand.value * 7}deg` }],
  }));

  return (
    <Animated.View style={inkStyle}>
      {quill ? (
        <Animated.View style={[styles.quill, handStyle]}>
          <LineArt drawing={quill} width={19} color={colors.onDesk} />
        </Animated.View>
      ) : null}
      <Text style={styles.line} numberOfLines={1} maxFontSizeMultiplier={1.2} accessibilityLiveRegion="polite" accessibilityLabel={text}>
        {quill ? <Text style={styles.quillRoom}>{'      '}</Text> : '✒  '}
        {text.slice(0, shown)}
        <Text style={styles.unwritten}>{text.slice(shown)}</Text>
      </Text>
    </Animated.View>
  );
};

/** The scribe's voice: one line under the title, written out as he says it. Remarks replace the standing line for a moment. */
export const ScribeLine: FC<ScribeLineProps> = ({ standing, onPress }) => {
  const { styles } = useTheme(makeStyles);
  const [remark, setRemark] = useState<{ line: string; id: number } | null>(null);
  // A remark's time on the desk is counted from when it has been written, not from its first letter.
  const [written, setWritten] = useState(0);

  useEffect(() => listen((line) => setRemark((last) => ({ line, id: (last?.id ?? 0) + 1 }))), []);

  useEffect(() => {
    if (!remark || written !== remark.id) return;
    const timer = setTimeout(() => setRemark(null), REMARK_MS);
    return () => clearTimeout(timer);
  }, [remark, written]);

  const line = remark?.line ?? standing;

  return (
    <Pressable style={styles.box} onPress={onPress} disabled={!onPress} hitSlop={6}>
      {line ? (
        <Written
          key={remark ? `remark-${remark.id}` : standing}
          text={line}
          onWritten={remark ? () => setWritten(remark.id) : undefined}
        />
      ) : null}
    </Pressable>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { height: 26, paddingHorizontal: 20, justifyContent: 'flex-start' },
    line: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 17 },
    unwritten: { color: 'transparent' },
    // The drawn quill sits in the room left at the start of the line, its nib at the first word.
    quill: { position: 'absolute', left: 0, top: 1 },
    quillRoom: { fontSize: 17 },
  });
