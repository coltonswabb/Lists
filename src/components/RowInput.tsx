import { type FC, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { fonts, type Palette, ROW_HEIGHT } from '../theme';
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
  const ended = useRef(false);

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
    show('');
    onLines([line]);
  };

  // The input is multiline so a pasted block keeps its line breaks: each line becomes a row.
  const change = (value: string) => {
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
      <View style={[styles.inner, rolled && styles.rolledInner, rolled && { backgroundColor: paper }]}>
        <RowLead lead={leadFor(text)} />
        <TextInput
          autoFocus
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
  rolledRow: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  rolledInner: { height: 48, paddingHorizontal: 12, borderRadius: 4 },
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
