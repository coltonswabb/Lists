import { type FC, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, ROW_HEIGHT } from '../theme';

type RowInputProps = {
  color: string;
  placeholder: string;
  initialText?: string;
  /**
   * Rapid entry: every finished line (Return, or each line of a pasted block) is reported and the
   * input stays open for the next one. Without it the first Return ends the edit.
   */
  onLines?: (lines: string[]) => void;
  /** Called once, with whatever trimmed text was left in the input (possibly empty). */
  onEnd: (remaining: string) => void;
};

export const RowInput: FC<RowInputProps> = ({ color, placeholder, initialText = '', onLines, onEnd }) => {
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
    <View style={[styles.row, { backgroundColor: color }]}>
      <TextInput
        autoFocus
        multiline
        scrollEnabled={false}
        value={text}
        onChangeText={change}
        onBlur={() => end(text)}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        selectionColor={colors.text}
        style={styles.input}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 20 },
  input: { color: colors.text, fontSize: 19, fontWeight: '600', padding: 0, height: 26, textAlignVertical: 'center' },
});
