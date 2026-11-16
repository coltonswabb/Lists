import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { parchment } from '../art';
import { useTheme } from '../ThemeContext';
import type { Palette } from '../theme';
import { LEAD_WIDTH } from './RowLead';
import { Tiled } from './Tiled';

/** Points per parchment tile: wide enough that one tile spans the sheet, so its stains don't repeat across it. */
const PARCHMENT_TILE = 420;

const SHADOW = 'rgba(0,0,0,0.2)';
const TONING = 'rgba(0,0,0,0.07)';
const CLEAR = 'rgba(0,0,0,0)';

/**
 * Everything that makes the sheet read as paper rather than a panel, laid over the rows and never
 * touchable: a faint grain, darker edges where it has been handled, a scribe's margin line, and the
 * shadow where the sheet curls away from each roll.
 */
export const PaperOverlay: FC = () => {
  const { colors, styles } = useTheme(makeStyles);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parchment ? (
        <Tiled source={parchment.source} tile={PARCHMENT_TILE} opacity={0.32} />
      ) : (
        <Image source={require('../../assets/textures/grain.png')} resizeMode="repeat" style={styles.grain} />
      )}
      <View style={styles.margin} />
      <LinearGradient colors={[TONING, CLEAR]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.left} />
      <LinearGradient colors={[CLEAR, TONING]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.right} />
      {colors.name === 'vigil' ? (
        // Night Vigil's sheet is ruled in gold down each side, as a book of hours is.
        <>
          <View style={[styles.gilt, styles.giltLeft]} />
          <View style={[styles.gilt, styles.giltRight]} />
        </>
      ) : null}
      <LinearGradient colors={[SHADOW, CLEAR]} style={styles.top} />
      <LinearGradient colors={[CLEAR, SHADOW]} style={styles.bottom} />
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    grain: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.9 },
    margin: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 16 + LEAD_WIDTH + 5,
      width: StyleSheet.hairlineWidth * 2,
      backgroundColor: colors.accent,
      opacity: 0.3,
    },
    gilt: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.accent, opacity: 0.55 },
    giltLeft: { left: 9 },
    giltRight: { right: 9 },
    left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 18 },
    right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 18 },
    top: { position: 'absolute', top: 0, left: 0, right: 0, height: 12 },
    bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 },
  });
