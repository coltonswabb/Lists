import { type FC, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, ROW_HEIGHT } from '../theme';
import { type Lead, RowLead } from './RowLead';

type RowInputProps = {
  /** What to show in the margin for the text typed so far. */
  leadFor: (text: string) => Lead;
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

export const RowInput: FC<RowInputProps> = ({ leadFor, placeholder, initialText = '', rolled = false, onLines, onEnd }) => {
  const [text, setText] = useState(initialText);
  const ended = useRef(false);

  const end = (remaining: string) => {
    if (ended.current) return;
    ended.current = true;
    onEnd(remaining.trim());
  };

  // The input is multiline so Return and pasted line breaks both arrive here as "\n".
  const change = (value: string) => {
    if (!value.includes('\n')) {
      setText(value);
      return;
    }
    const parts = value.split('\n');
    const remainder = parts.pop() ?? '';
    const lines = parts.map((line) => line.trim()).filter(Boolean);
    if (!onLines) {
      end(lines[0] ?? remainder);
      return;
    }
    if (lines.length === 0 && !remainder.trim()) {
      end('');
      return;
    }
    setText(remainder);
    if (lines.length > 0) onLines(lines);
  };

  return (
    <View style={[styles.row, rolled && styles.rolledRow]}>
      <View style={[styles.inner, rolled && styles.rolledInner]}>
        <RowLead lead={leadFor(text)} />
        <TextInput
          autoFocus
          multiline
          scrollEnabled={false}
          value={text}
          onChangeText={change}
          onBlur={() => end(text)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaded}
          selectionColor={colors.accent}
          style={styles.input}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.parchmentShade,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
  },
  rolledRow: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  rolledInner: { height: 48, paddingHorizontal: 12, borderRadius: 4, backgroundColor: colors.parchmentShade },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '500',
    padding: 0,
    height: 24,
    textAlignVertical: 'center',
  },
});
