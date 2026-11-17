import { type ComponentRef, type FC, type RefObject, useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../ThemeContext';
import { mixColors, type Vellum, fonts, MAX_TEXT_SCALE, type Palette, ROW_HEIGHT, TEXT_SCALE } from '../theme';
import { Finial, hasFinial } from './Finial';
import { ROLL_LIGHT, ROLL_LIGHT_AT } from './Roller';
import { type Lead, RowLead } from './RowLead';

// One of each, made once: an entrance built afresh on every render can be taken for a new one and played again.
const LAID_DOWN = FadeInDown.duration(300).easing(Easing.out(Easing.cubic));
const APPEAR = FadeIn.duration(120);
const INKED = FadeIn.duration(220);

export type RowInputHandle = {
  finish: () => void;
  /** Nothing has been written in it yet. */
  isBlank: () => boolean;
  /** Puts the caret back in it and brings the keyboard up. */
  focus: () => void;
};

type RowInputProps = {
  /** What to show in the margin for the text typed so far. */
  leadFor: (text: string) => Lead;
  /** The paper tone at this row's position on the scroll. */
  paper: string;
  placeholder: string;
  initialText?: string;
  /** Drawn as a rolled scroll on the shelf rather than as a line on a sheet. */
  rolled?: boolean;
  /** Filled in while the input is open with a way to finish it from outside, as a touch elsewhere on the desk does. */
  handleRef?: RefObject<RowInputHandle | null>;
  /** Rolled only: how the scroll is dressed for its kind, given its name so far: its ribbon, and a dark kind's own vellum. */
  dressFor?: (name: string) => { ribbon?: string; vellum?: Vellum };
  /** Already lying in its place, as a scroll pulled down by hand is: it only needs to appear, not to be set down again. */
  laid?: boolean;
  /**
   * Rapid entry: every finished line (Return, or each line of a pasted block) is reported and the
   * input stays open for the next one. Without it the first Return ends the edit.
   */
  onLines?: (lines: string[]) => void;
  /** Called once, with whatever trimmed text was left in the input (possibly empty). */
  onEnd: (remaining: string) => void;
};

export const RowInput: FC<RowInputProps> = ({ leadFor, paper, placeholder, initialText = '', rolled = false, laid = false, dressFor, handleRef, onLines, onEnd }) => {
  const { colors, styles } = useTheme(makeStyles);
  const [text, setText] = useState(initialText);
  // What the input holds right now. On iOS a second Return can arrive before a re-render has cleared
  // the native field, so the state alone would hand the same line over twice.
  const latest = useRef(initialText);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  /**
   * The text just handed over by Return. Keys typed straight after can reach the native field before it
   * has been cleared, arriving as this text plus the new keys; the old part is dropped.
   */
  const submitted = useRef<string | null>(null);
  const ended = useRef(false);

  // autoFocus alone does not take when the row is opened from outside the list (the inkwell), so ask again.
  // Once it has taken, it is left alone: asking again after that could fight whatever the keyboard is doing.
  const focused = useRef(false);
  useEffect(() => {
    const timers = [60, 250, 600, 1100, 1800].map((delay) =>
      setTimeout(() => {
        if (!focused.current && !ended.current && !input.current?.isFocused()) input.current?.focus();
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const show = (value: string) => {
    latest.current = value;
    setText(value);
  };

  const end = (remaining: string) => {
    if (ended.current) return;
    ended.current = true;
    onEnd(remaining.trim());
  };

  // Finishing from outside keeps what was written and puts a blank row away, focused or not.
  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      finish: () => end(latest.current),
      isBlank: () => latest.current.trim() === '',
      focus: () => input.current?.focus(),
    };
    return () => {
      handleRef.current = null;
    };
    // `end` reads only refs and the latest onEnd is wanted at the moment of finishing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleRef, onEnd]);

  // Return submits rather than inserting a line break; finished lines leave the input at once.
  const submit = () => {
    const line = latest.current.trim();
    if (!onLines || !line) {
      end(line);
      return;
    }
    submitted.current = latest.current;
    input.current?.clear();
    show('');
    onLines([line]);
  };

  // The input is multiline so a pasted block keeps its line breaks: each line becomes a row.
  const change = (typed: string) => {
    const stale = submitted.current;
    const value = stale && typed.startsWith(stale) ? typed.slice(stale.length) : typed;
    if (!stale || !typed.startsWith(stale)) submitted.current = null;
    if (!value.includes('\n')) {
      show(value);
      return;
    }
    const parts = value.split('\n');
    const remainder = parts.pop() ?? '';
    const lines = parts.map((line) => line.trim()).filter(Boolean);
    if (!onLines) {
      end(lines[0] ?? remainder);
      return;
    }
    show(remainder);
    if (lines.length > 0) onLines(lines);
  };

  // A scroll being named is already made of what its kind is made of: a dark kind's vellum, bright ink, and its ribbon.
  const dress = rolled ? dressFor?.(text.trim()) : undefined;
  const vellum = dress?.vellum;
  const sheet = vellum ? mixColors(vellum.from, vellum.to, 0.5) : paper;

  return (
    <Animated.View
      // A new scroll is laid on the shelf from above and comes to rest without a bounce, as paper does; a new line is
      // inked onto the page.
      entering={rolled && !laid ? LAID_DOWN : laid ? APPEAR : INKED}
      style={[styles.row, rolled ? styles.rolledRow : { backgroundColor: paper }]}
    >
      {/* A scroll being named lies on the shelf like the others: rounded by the light, with its rod's ends showing. */}
      {rolled && hasFinial(colors.name) ? <Finial paper={colors.name} side="left" length={34} tuck={18} /> : null}
      <View style={[styles.inner, rolled && styles.rolledInner, rolled && { backgroundColor: sheet }, dress?.ribbon !== undefined && styles.ribboned]}>
        <RowLead lead={leadFor(text)} />
        <TextInput
          ref={input}
          autoFocus
          maxFontSizeMultiplier={MAX_TEXT_SCALE}
          multiline
          scrollEnabled={false}
          value={text}
          submitBehavior="submit"
          onSubmitEditing={submit}
          onChangeText={change}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => end(latest.current)}
          placeholder={placeholder}
          placeholderTextColor={vellum ? `${vellum.ink}99` : colors.inkFaded}
          selectionColor={colors.accent}
          style={[styles.input, vellum ? { color: vellum.ink } : null]}
        />
        {dress?.ribbon ? <View pointerEvents="none" style={[styles.ribbon, { backgroundColor: dress.ribbon }]} /> : null}
        {rolled ? <LinearGradient colors={ROLL_LIGHT} locations={ROLL_LIGHT_AT} style={styles.rollLight} pointerEvents="none" /> : null}
      </View>
      {rolled && hasFinial(colors.name) ? <Finial paper={colors.name} side="right" length={34} tuck={18} /> : null}
    </Animated.View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
  },
  ribboned: { paddingRight: 34 },
  ribbon: { position: 'absolute', right: 13, top: 0, bottom: 0, width: 9 },
  rolledRow: { backgroundColor: 'transparent', borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 2 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  rolledInner: { flex: 1, height: ROW_HEIGHT - 14, paddingHorizontal: 12, borderRadius: 3, zIndex: 1 },
  rollLight: { ...StyleSheet.absoluteFill, borderRadius: 3 },
  input: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 21,
    padding: 0,
    height: Math.round(28 * TEXT_SCALE),
    textAlignVertical: 'center',
  },
});
