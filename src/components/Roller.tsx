import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '../ThemeContext';
import { mixColors, type Palette } from '../theme';
import { Finial, hasFinial } from './Finial';

const THIN = 22;
const FULL = 34;
/** A painted end cap's length, and how much of its collar sits under the roll. Together they leave the roll 4pt proud of the sheet. */
const FINIAL = 36;
const FINIAL_TUCK = 20;
const SHADOW = 'rgba(0,0,0,0.3)';
const CLEAR = 'rgba(0,0,0,0)';

/** Where the light falls across a cylinder lit from above: a dim rim, a bright shoulder, then a long fall into shade. */
const CURVE = [0, 0.2, 0.5, 0.86, 1] as const;

/** Light from above on a roll lying on its side, laid over whatever colour the roll is. */
export const ROLL_LIGHT = ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.26)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.3)'] as const;
export const ROLL_LIGHT_AT = [0, 0.16, 0.5, 0.84, 1] as const;

/** A round thing's tones, top to bottom, from the one colour it is made of. */
export const cylinderOf = (color: string, shade: string) =>
  [
    mixColors(color, shade, 0.14),
    mixColors(color, '#ffffff', 0.3),
    color,
    mixColors(color, shade, 0.34),
    mixColors(color, shade, 0.55),
  ] as const;

type RollerProps = {
  /** The paper wound onto this rod, which takes the tone of the sheet where it meets it. */
  paper: string;
  /** 0 to 1: how much of the scroll has been wound on. The roll fattens as it fills. */
  fullness?: SharedValue<number>;
};

/**
 * One end of a scroll: the paper wound round its rod, with a turned handle at each side. The roll
 * is shaded as a cylinder lit from above, and throws a soft shadow on whatever lies under it.
 */
export const Roller: FC<RollerProps> = ({ paper, fullness }) => {
  const { colors, styles } = useTheme(makeStyles);
  const rollStyle = useAnimatedStyle(() => ({ height: THIN + (FULL - THIN) * (fullness?.value ?? 0) }));
  const collar = cylinderOf(colors.gold, colors.desk);
  const painted = hasFinial(colors.name);
  const plainEnd = (
    <>
      <View style={styles.knob}>
        <View style={styles.glint} />
      </View>
      <LinearGradient colors={collar} locations={CURVE} style={styles.collar} />
    </>
  );
  return (
    <View style={[styles.roller, painted && styles.rollerPainted]}>
      {painted ? <Finial paper={colors.name} side="left" length={FINIAL} tuck={FINIAL_TUCK} /> : plainEnd}
      <Animated.View style={[styles.roll, rollStyle]}>
        <LinearGradient colors={cylinderOf(paper, colors.desk)} locations={CURVE} style={styles.paper} />
        {/* The edge of the wound sheet, seen where it laps over itself. */}
        <View style={styles.lap} />
        <LinearGradient colors={[SHADOW, CLEAR]} style={styles.shadow} pointerEvents="none" />
      </Animated.View>
      {painted ? (
        <Finial paper={colors.name} side="right" length={FINIAL} tuck={FINIAL_TUCK} />
      ) : (
        <View style={styles.mirrored}>{plainEnd}</View>
      )}
    </View>
  );
};

/** The roller's box is as tall as the fullest roll, so it can fatten without moving anything around it. */
export const ROLLER_HEIGHT = FULL + 2;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    roller: { flexDirection: 'row', alignItems: 'center', height: ROLLER_HEIGHT, marginHorizontal: 2 },
    rollerPainted: { marginHorizontal: 0 },
    mirrored: { flexDirection: 'row-reverse', alignItems: 'center' },
    roll: { flex: 1, zIndex: 1 },
    paper: { ...StyleSheet.absoluteFill, borderRadius: 3 },
    lap: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '62%',
      height: StyleSheet.hairlineWidth,
      backgroundColor: mixColors(colors.ink, colors.desk, 0.5),
      opacity: 0.22,
    },
    shadow: { position: 'absolute', left: 4, right: 4, top: '100%', height: 9 },
    collar: { width: 4, height: 26, borderRadius: 1 },
    knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    glint: {
      position: 'absolute',
      top: 2,
      left: 2.5,
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.45)',
    },
  });
