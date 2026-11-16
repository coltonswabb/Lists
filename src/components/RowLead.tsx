import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export type Lead =
  /** A painted first letter, for things that have a name: scrolls and sections. */
  | { kind: 'initial'; text: string; pigment: string }
  /** A small margin label, for ordinary items: their number, or a mark once finished. */
  | { kind: 'label'; label: string; color: string };

export const LEAD_WIDTH = 34;

export const RowLead: FC<{ lead: Lead }> = ({ lead }) => {
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
      <Text style={styles.letter}>{lead.text.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cell: { width: LEAD_WIDTH, height: LEAD_WIDTH, marginRight: 12, justifyContent: 'center' },
  block: { alignItems: 'center', borderRadius: 2 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.4 },
  letter: { color: colors.onAction, fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
});
