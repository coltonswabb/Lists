import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { celestial, desks, drawings } from '../art';
import { usePalette } from '../ThemeContext';
import { LineArt } from './LineArt';
import { Tiled } from './Tiled';

/** Points per tile: the 512px textures shown at about 1.5x, so the grain reads at a natural size. */
const TILE = 340;
const CORNER = 170;
const MOON = 78;
const SHADE = 'rgba(0,0,0,0.45)';
const CLEAR = 'rgba(0,0,0,0)';

/**
 * The surface every screen sits on: the paper's desk texture, tiled, with the edges falling into
 * shadow as if lit by one candle from above. Papers without a texture keep their plain desk colour.
 */
type DeskProps = {
  /** Night: the desk lies in moonlight, lit only by the candle. */
  night?: boolean;
};

export const Desk: FC<DeskProps> = ({ night = false }) => {
  const { width, height } = useWindowDimensions();
  const colors = usePalette();
  const texture = desks[colors.name];
  const gilded = colors.name === 'vigil';
  const moon = celestial.moon;
  const corner = drawings['sky-corner'];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk }]}>
      {texture ? <Tiled source={texture.source} tile={TILE} /> : null}
      {/* Night Vigil alone is gilded, with corner-work at the head of its desk. */}
      {gilded && corner ? (
        <>
          <LineArt drawing={corner} width={CORNER} color={colors.accent} style={styles.cornerLeft} />
          <LineArt drawing={corner} width={CORNER} color={colors.accent} style={styles.cornerRight} />
        </>
      ) : null}
      {night ? (
        <>
          {/* Moonlight from the window: the whole desk cooled to blue-black, darkest at the head. */}
          <LinearGradient colors={['rgba(10,18,52,0.62)', 'rgba(8,12,34,0.5)', 'rgba(4,6,16,0.42)']} style={StyleSheet.absoluteFill} />
          {/* And the one warm thing in the room: the candle's light spilling over the desk around it. */}
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="candlelight" cx="0.16" cy="0.84" r="0.75" gradientUnits="objectBoundingBox">
                <Stop offset="0" stopColor="#ffb04a" stopOpacity={0.3} />
                <Stop offset="0.35" stopColor="#ff9a30" stopOpacity={0.1} />
                <Stop offset="1" stopColor="#ff8a20" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={height} fill="url(#candlelight)" />
          </Svg>
          {moon ? <Image source={moon.source} style={[styles.moon, { top: height * 0.47, width: MOON, height: (MOON * moon.height) / moon.width }]} /> : null}
        </>
      ) : null}
      <LinearGradient colors={[SHADE, CLEAR]} style={styles.top} />
      <LinearGradient colors={[CLEAR, SHADE]} style={styles.bottom} />
      <LinearGradient colors={[SHADE, CLEAR]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.left} />
      <LinearGradient colors={[CLEAR, SHADE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.right} />
    </View>
  );
};

const styles = StyleSheet.create({
  // Hard into the corners of the screen, so the vinework reads as the desk's own edge.
  // The moon in the window, out on the open desk to the right, faint enough not to compete with the scrolls.
  moon: { position: 'absolute', right: 34, opacity: 0.32 },
  cornerLeft: { position: 'absolute', top: 4, left: -5, opacity: 0.4 },
  cornerRight: { position: 'absolute', top: 4, right: -5, opacity: 0.4, transform: [{ scaleX: -1 }] },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 50 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 50 },
});
