import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

type InitialProps = {
  /** The row's text; its first letter is painted as an illuminated initial. */
  text: string;
  pigment: string;
  faded?: boolean;
};

export const Initial: FC<InitialProps> = ({ text, pigment, faded = false }) => {
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
  faded: { opacity: 0.35 },
  letter: { color: colors.onPigment, fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
});
