import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import { mixColors, type Palette } from '../theme';

type RollerProps = {
  /** The paper wound onto this rod, which takes the tone of the sheet where it meets it. */
  paper: string;
};

/**
 * One end of a scroll, drawn flat: the paper wound round its rod, with a turned handle at each side.
 * Three bands of tone stand in for the curve of the roll.
 */
export const Roller: FC<RollerProps> = ({ paper }) => {
  const { colors, styles } = useTheme(makeStyles);
  const handle = (
    <>
      <View style={styles.knob} />
      <View style={styles.collar} />
    </>
  );
  return (
    <View style={styles.roller}>
      {handle}
      <View style={styles.roll}>
        <View style={[styles.band, { flex: 3, backgroundColor: mixColors(paper, '#ffffff', 0.22) }]} />
        <View style={[styles.band, { flex: 5, backgroundColor: paper }]} />
        <View style={[styles.band, { flex: 3, backgroundColor: mixColors(paper, colors.desk, 0.28) }]} />
      </View>
      <View style={styles.collar} />
      <View style={styles.knob} />
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    roller: { flexDirection: 'row', alignItems: 'center', height: 24, marginHorizontal: 2 },
    roll: { flex: 1, height: 22, borderRadius: 3, overflow: 'hidden' },
    band: { alignSelf: 'stretch' },
    collar: { width: 4, height: 24, borderRadius: 1, backgroundColor: colors.gold },
    knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  });
