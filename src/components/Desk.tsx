import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { desks, drawings } from '../art';
import { usePalette } from '../ThemeContext';
import { LineArt } from './LineArt';
import { Tiled } from './Tiled';

/** Points per tile: the 512px textures shown at about 1.5x, so the grain reads at a natural size. */
const TILE = 340;
const CORNER = 150;
const SHADE = 'rgba(0,0,0,0.45)';
const CLEAR = 'rgba(0,0,0,0)';

/**
 * The surface every screen sits on: the paper's desk texture, tiled, with the edges falling into
 * shadow as if lit by one candle from above. Papers without a texture keep their plain desk colour.
 */
export const Desk: FC = () => {
  const colors = usePalette();
  const texture = desks[colors.name];
  const gilded = colors.name === 'vigil';
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
      <LinearGradient colors={[SHADE, CLEAR]} style={styles.top} />
      <LinearGradient colors={[CLEAR, SHADE]} style={styles.bottom} />
      <LinearGradient colors={[SHADE, CLEAR]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.left} />
      <LinearGradient colors={[CLEAR, SHADE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.right} />
    </View>
  );
};

const styles = StyleSheet.create({
  cornerLeft: { position: 'absolute', top: 44, left: 6, opacity: 0.4 },
  cornerRight: { position: 'absolute', top: 44, right: 6, opacity: 0.4, transform: [{ scaleX: -1 }] },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 50 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 50 },
});
