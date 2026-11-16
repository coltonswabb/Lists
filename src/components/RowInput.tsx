import { type FC, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, ROW_HEIGHT } from '../theme';

type RowInputProps = {
  color: string;
  placeholder: string;
  initialText?: string;
  /** Called once with the trimmed text; an empty string means the edit was abandoned. */
  onDone: (text: string) => void;
};

export const RowInput: FC<RowInputProps> = ({ color, placeholder, initialText = '', onDone }) => {
  const [text, setText] = useState(initialText);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(text.trim());
  };

  return (
    <View style={[styles.row, { backgroundColor: color }]}>
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={finish}
        onBlur={finish}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        returnKeyType="done"
        selectionColor={colors.text}
        style={styles.input}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { height: ROW_HEIGHT, justifyContent: 'center', paddingHorizontal: 20 },
  input: { color: colors.text, fontSize: 19, fontWeight: '600', padding: 0 },
});
