import { type ComponentRef, type FC, useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { fonts, type Palette, ROW_HEIGHT } from '../theme';
import { Finial, hasFinial } from './Finial';
import { ROLL_LIGHT, ROLL_LIGHT_AT } from './Roller';
import { type Lead, RowLead } from './RowLead';

type RowInputProps = {
  /** What to show in the margin for the text typed so far. */
  leadFor: (text: string) => Lead;
  /** The paper tone at this row's position on the scroll. */
  paper: string;
  placeholder: string;
  initialText?: string;
  /** Drawn as a rolled scroll on the shelf rather than as a line on a sheet. */
  rolled?: boolean;
  /**
   * Rapid entry: every finished line (Return, or each line of a pasted block) is reported and the
   * input stays open for the next one. Without it the first Return ends the edit.
   */
  onLines?: (lines: string[]) => void;
  /** Called once, with whatever trimmed text was left in the input (possibly empty). */
  onEnd: (remaining: string) => void;
};

export const RowInput: FC<RowInputProps> = ({ leadFor, paper, placeholder, initialText = '', rolled = false, onLines, onEnd }) => {
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
  useEffect(() => {
    const timers = [60, 250, 600].map((delay) =>
      setTimeout(() => {
        if (!input.current?.isFocused()) input.current?.focus();
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

  return (
    <View style={[styles.row, rolled ? styles.rolledRow : { backgroundColor: paper }]}>
      {/* A scroll being named lies on the shelf like the others: rounded by the light, with its rod's ends showing. */}
      {rolled && hasFinial(colors.name) ? <Finial paper={colors.name} side="left" length={34} tuck={18} /> : null}
      <View style={[styles.inner, rolled && styles.rolledInner, rolled && { backgroundColor: paper }]}>
        {rolled ? <LinearGradient colors={ROLL_LIGHT} locations={ROLL_LIGHT_AT} style={styles.rollLight} pointerEvents="none" /> : null}
        <RowLead lead={leadFor(text)} />
        <TextInput
          ref={input}
          autoFocus
          maxFontSizeMultiplier={1.2}
          multiline
          scrollEnabled={false}
          value={text}
          submitBehavior="submit"
          onSubmitEditing={submit}
          onChangeText={change}
          onBlur={() => end(latest.current)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaded}
          selectionColor={colors.accent}
          style={styles.input}
        />
      </View>
      {rolled && hasFinial(colors.name) ? <Finial paper={colors.name} side="right" length={34} tuck={18} /> : null}
    </View>
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
  rolledRow: { backgroundColor: 'transparent', borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 2 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  rolledInner: { flex: 1, height: 48, paddingHorizontal: 12, borderRadius: 3, zIndex: 1 },
  rollLight: { ...StyleSheet.absoluteFill, borderRadius: 3 },
  input: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 21,
    padding: 0,
    height: 28,
    textAlignVertical: 'center',
  },
});
