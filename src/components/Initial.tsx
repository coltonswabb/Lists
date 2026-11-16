import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

/** `initial` paints the row's first letter in a block; `stripe` is a slim margin mark that leaves room for text. */
export type MarkerKind = 'initial' | 'stripe';

type InitialProps = {
  text: string;
  pigment: string;
  kind: MarkerKind;
  faded?: boolean;
};

export const Initial: FC<InitialProps> = ({ text, pigment, kind, faded = false }) => {
  if (kind === 'stripe') return <View style={[styles.stripe, { backgroundColor: pigment }, faded && styles.faded]} />;
  const letter = text.trim().charAt(0).toUpperCase();
  return (
    <View style={[styles.block, { backgroundColor: pigment }, faded && styles.faded]}>
      <Text style={styles.letter}>{letter}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    width: 38,
    height: 38,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  stripe: { width: 5, height: 34, marginRight: 14, borderRadius: 2 },
  faded: { opacity: 0.35 },
  letter: { color: colors.onPigment, fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
});
