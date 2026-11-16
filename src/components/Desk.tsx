import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deskProps, desks } from '../art';
import { usePalette } from '../ThemeContext';
import { Tiled } from './Tiled';

/** Points per tile: the 512px textures shown at about 1.5x, so the grain reads at a natural size. */
const TILE = 340;
const CANDLE = 58;
const INKWELL = 92;
const SHADE = 'rgba(0,0,0,0.45)';
const CLEAR = 'rgba(0,0,0,0)';

/**
 * The surface every screen sits on: the paper's desk texture, tiled, with the edges falling into
 * shadow as if lit by one candle from above. Papers without a texture keep their plain desk colour.
 */
type DeskProps = {
  /** Shows the scribe's inkwell and candle. Only the Library has room for them; elsewhere they would sit under the page. */
  furnished: boolean;
};

export const Desk: FC<DeskProps> = ({ furnished }) => {
  const colors = usePalette();
  const texture = desks[colors.name];
  const insets = useSafeAreaInsets();
  const inkwell = furnished ? deskProps.inkwell : undefined;
  const candle = furnished ? deskProps.candle : undefined;
  // The scribe's things sit low on the desk, clear of the labels along its foot, under the same shadow as the wood.
  const foot = insets.bottom + 58;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.desk }]}>
      {texture ? <Tiled source={texture.source} tile={TILE} /> : null}
      {candle ? (
        <Image source={candle.source} style={{ position: 'absolute', left: 22, bottom: foot, width: CANDLE, height: (CANDLE * candle.height) / candle.width }} />
      ) : null}
      {inkwell ? (
        <Image source={inkwell.source} style={{ position: 'absolute', right: 14, bottom: foot, width: INKWELL, height: (INKWELL * inkwell.height) / inkwell.width }} />
      ) : null}
      <LinearGradient colors={[SHADE, CLEAR]} style={styles.top} />
      <LinearGradient colors={[CLEAR, SHADE]} style={styles.bottom} />
      <LinearGradient colors={[SHADE, CLEAR]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.left} />
      <LinearGradient colors={[CLEAR, SHADE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.right} />
    </View>
  );
};

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 50 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 50 },
});
