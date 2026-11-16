import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '../ThemeContext';
import { mixColors, type Palette } from '../theme';

const THIN = 22;
const FULL = 34;

type RollerProps = {
  /** The paper wound onto this rod, which takes the tone of the sheet where it meets it. */
  paper: string;
  /** 0 to 1: how much of the scroll has been wound on. The roll fattens as it fills. */
  fullness?: SharedValue<number>;
};

/**
 * One end of a scroll, drawn flat: the paper wound round its rod, with a turned handle at each side.
 * Three bands of tone stand in for the curve of the roll.
 */
export const Roller: FC<RollerProps> = ({ paper, fullness }) => {
  const { colors, styles } = useTheme(makeStyles);
  const rollStyle = useAnimatedStyle(() => ({ height: THIN + (FULL - THIN) * (fullness?.value ?? 0) }));
  return (
    <View style={styles.roller}>
      <View style={styles.knob} />
      <View style={styles.collar} />
      <Animated.View style={[styles.roll, rollStyle]}>
        <View style={[styles.band, { flex: 3, backgroundColor: mixColors(paper, '#ffffff', 0.22) }]} />
        <View style={[styles.band, { flex: 5, backgroundColor: paper }]} />
        <View style={[styles.band, { flex: 3, backgroundColor: mixColors(paper, colors.desk, 0.28) }]} />
      </Animated.View>
      <View style={styles.collar} />
      <View style={styles.knob} />
    </View>
  );
};

/** The roller's box is as tall as the fullest roll, so it can fatten without moving anything around it. */
export const ROLLER_HEIGHT = FULL + 2;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    roller: { flexDirection: 'row', alignItems: 'center', height: ROLLER_HEIGHT, marginHorizontal: 2 },
    roll: { flex: 1, borderRadius: 3, overflow: 'hidden' },
    band: { alignSelf: 'stretch' },
    collar: { width: 4, height: 26, borderRadius: 1, backgroundColor: colors.gold },
    knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  });
