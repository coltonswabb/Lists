import { type FC, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { drawings } from '../art';
import { listen } from '../scribe';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';
import { LineArt } from './LineArt';

const REMARK_MS = 2600;

type ScribeLineProps = {
  /** What the scribe says when nothing has just happened. May be empty. */
  standing: string;
  onPress?: () => void;
};

/** The scribe's voice: one quiet line under the title. Remarks replace the standing line for a moment. */
export const ScribeLine: FC<ScribeLineProps> = ({ standing, onPress }) => {
  const { colors, styles } = useTheme(makeStyles);
  const quill = drawings.quill;
  const [remark, setRemark] = useState<{ line: string; id: number } | null>(null);

  useEffect(() => listen((line) => setRemark((last) => ({ line, id: (last?.id ?? 0) + 1 }))), []);

  useEffect(() => {
    if (!remark) return;
    const timer = setTimeout(() => setRemark(null), REMARK_MS);
    return () => clearTimeout(timer);
  }, [remark]);

  const line = remark?.line ?? standing;

  return (
    <Pressable style={styles.box} onPress={onPress} disabled={!onPress} hitSlop={6}>
      {line && quill ? <LineArt drawing={quill} width={19} color={colors.onDeskFaded} style={styles.quill} /> : null}
      {line ? (
        <Animated.Text
          key={remark ? remark.id : standing}
          entering={FadeIn.duration(220)}
          style={styles.line}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          accessibilityLiveRegion="polite"
        >
          {quill ? <Text style={styles.quillRoom}>{'      '}</Text> : '✒  '}
          {line}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { height: 26, paddingHorizontal: 20, justifyContent: 'flex-start' },
    line: { color: colors.onDeskFaded, fontFamily: fonts.bodyItalic, fontSize: 17 },
    // The drawn quill sits in the room left at the start of the line, its nib at the first word.
    quill: { position: 'absolute', left: 20, top: 1 },
    quillRoom: { fontSize: 17 },
  });
