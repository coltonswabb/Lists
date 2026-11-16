import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { type Palette, fonts } from '../theme';

export type Lead =
  /** A painted first letter, for things that have a name: scrolls and sections. */
  | { kind: 'initial'; text: string; pigment: string; letter: string }
  /** A small margin label, for ordinary items: their number, or a mark once finished. */
  | { kind: 'label'; label: string; color: string };

export const LEAD_WIDTH = 34;

export const RowLead: FC<{ lead: Lead }> = ({ lead }) => {
  const { colors, styles } = useTheme(makeStyles);
  if (lead.kind === 'label') {
    return (
      <View style={styles.cell}>
        <Text style={[styles.label, { color: lead.color }]} numberOfLines={1}>
          {lead.label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.cell, styles.block, { backgroundColor: lead.pigment }]}>
      <Text style={[styles.letter, { color: lead.letter }]}>{lead.text.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  cell: { width: LEAD_WIDTH, height: LEAD_WIDTH, marginRight: 12, justifyContent: 'center' },
  block: { alignItems: 'center', borderRadius: 2 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.4 },
  letter: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
});
