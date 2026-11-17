import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { borders, desks, drawings } from '../art';
import { usePalette } from '../ThemeContext';
import { LineArt } from './LineArt';
import { Tiled } from './Tiled';

/** Points per tile: the 512px textures shown at about 1.5x, so the grain reads at a natural size. */
const TILE = 340;
const CORNER = 170;
const BORDER = 150;
const SHADE = 'rgba(0,0,0,0.45)';
const CLEAR = 'rgba(0,0,0,0)';

/**
 * The surface every screen sits on: the paper's desk texture, tiled, with the edges falling into
 * shadow as if lit by one candle from above. Papers without a texture keep their plain desk colour.
 */
type DeskProps = {
  /** Night: the desk is cooled to moonlight. The light itself is laid over everything by NightLight. */
  night?: boolean;
};

export const Desk: FC<DeskProps> = ({ night = false }) => {
  const colors = usePalette();
  const texture = desks[colors.name];
  const gilded = colors.name === 'vigil';
  const corner = drawings['sky-corner'];
  // By day the head of the desk wears the corner-work of the book the paper is from.
  const border = night ? undefined : borders[colors.name];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk }]}>
      {texture ? <Tiled source={texture.source} tile={TILE} /> : null}
      {night ? (
        <>
          {/* Moonlight from the window: the whole desk cooled to blue-black, darkest at the head. */}
          <LinearGradient colors={['rgba(10,18,52,0.62)', 'rgba(8,12,34,0.5)', 'rgba(4,6,16,0.42)']} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      <LinearGradient colors={[SHADE, CLEAR]} style={styles.top} />
      <LinearGradient colors={[CLEAR, SHADE]} style={styles.bottom} />
      <LinearGradient colors={[SHADE, CLEAR]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.left} />
      <LinearGradient colors={[CLEAR, SHADE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.right} />
      {/* Night Vigil, and every night, is gilded with corner-work at the head of the desk, laid over the
          moonlight and the shade so the gold catches the light. Brighter by night, when it is the room's trim. */}
      {border ? (
        <>
          <LineArt drawing={border} width={BORDER} color={colors.gold} style={styles.borderLeft} />
          <LineArt drawing={border} width={BORDER} color={colors.gold} style={styles.borderRight} />
        </>
      ) : (gilded || night) && corner ? (
        <>
          <LineArt drawing={corner} width={CORNER} color={colors.accent} style={[styles.cornerLeft, night && styles.cornerLit]} />
          <LineArt drawing={corner} width={CORNER} color={colors.accent} style={[styles.cornerRight, night && styles.cornerLit]} />
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // Hard into the corners of the screen, so the vinework reads as the desk's own edge.
  cornerLit: { opacity: 0.75 },
  // Fainter than the night's gilding: by day it is part of the desk, not the room's trim.
  borderLeft: { position: 'absolute', top: 6, left: 2, opacity: 0.38 },
  borderRight: { position: 'absolute', top: 6, right: 2, opacity: 0.38, transform: [{ scaleX: -1 }] },
  cornerLeft: { position: 'absolute', top: 4, left: -5, opacity: 0.4 },
  cornerRight: { position: 'absolute', top: 4, right: -5, opacity: 0.4, transform: [{ scaleX: -1 }] },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 50 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 50 },
});
