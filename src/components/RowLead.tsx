import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { drawings } from '../art';
import { useTheme } from '../ThemeContext';
import { type Palette, fonts, MAX_TEXT_SCALE } from '../theme';
import { LineArt } from './LineArt';

export type Lead =
  /** A painted first letter, for things that have a name: scrolls and sections. */
  | { kind: 'initial'; text: string; pigment: string; letter: string; flourish?: string }
  /** A small margin label, for ordinary items: their number, or a mark once finished. */
  | { kind: 'label'; label: string; color: string }
  /** A drawn tick, for a finished item. */
  | { kind: 'done'; color: string };

export const LEAD_WIDTH = 34;
/** The flourish is drawn round an empty square about half its width, so it is twice the block's size. */
const FLOURISH = LEAD_WIDTH * 1.9;
/** The vinework frame's opening is about three fifths of its width, so the painted block just fills it. */
const FRAME = LEAD_WIDTH * 1.62;

export const RowLead: FC<{ lead: Lead }> = ({ lead }) => {
  const { styles } = useTheme(makeStyles);
  if (lead.kind === 'done') {
    return (
      <View style={styles.cell}>
        {drawings.tick ? (
          <LineArt drawing={drawings.tick} width={22} color={lead.color} />
        ) : (
          <View style={[styles.tick, { borderColor: lead.color }]} />
        )}
      </View>
    );
  }
  if (lead.kind === 'label') {
    return (
      <View style={styles.cell}>
        <Text style={[styles.label, { color: lead.color }]} numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT_SCALE}>
          {lead.label}
        </Text>
      </View>
    );
  }
  // A vinework frame when it has been drawn; otherwise the looser pen-flourish.
  const border = lead.flourish ? drawings['initial-frame'] : undefined;
  const frame = lead.flourish && !border ? drawings.flourish : undefined;
  return (
    <View style={[styles.cell, styles.block, { backgroundColor: lead.pigment }]}>
      {border && lead.flourish ? (
        <LineArt drawing={border} width={FRAME} color={lead.flourish} style={styles.frame} />
      ) : null}
      {frame && lead.flourish ? (
        // Pen-flourishing round a painted initial, as a scribe would add to mark a new section.
        <LineArt drawing={frame} width={FLOURISH} color={lead.flourish} style={styles.flourish} />
      ) : null}
      <Text style={[styles.letter, { color: lead.letter }]} maxFontSizeMultiplier={1.15}>{lead.text.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  cell: { width: LEAD_WIDTH, height: LEAD_WIDTH, marginRight: 12, justifyContent: 'center' },
  // Two sides of a small rectangle, turned: a tick without needing a glyph the font may lack.
  tick: {
    width: 7,
    height: 13,
    marginLeft: 6,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  block: { alignItems: 'center', borderRadius: 2 },
  label: { fontFamily: fonts.label, fontSize: 15, letterSpacing: 0.6 },
  letter: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  frame: { position: 'absolute', left: (LEAD_WIDTH - FRAME) / 2, top: (LEAD_WIDTH - FRAME) / 2, opacity: 0.85 },
  flourish: { position: 'absolute', left: (LEAD_WIDTH - FLOURISH) / 2, top: (LEAD_WIDTH - FLOURISH) / 2, opacity: 0.55 },
});
