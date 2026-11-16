import { type FC, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { deckle } from '../art';
import { usePalette } from '../ThemeContext';
import { mixColors } from '../theme';

/** How far into the sheet the torn edge bites, in points. */
const DEPTH = 5;

/**
 * One torn side of the sheet. The strip is opaque where paper is missing, so tinted as the shadowed
 * desk it reads as the desk showing past a ragged edge. Repeated down the sheet's whole height.
 */
export const DeckleEdge: FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const colors = usePalette();
  const [height, setHeight] = useState(0);
  const strip = deckle;
  if (!strip) return null;
  const tile = (DEPTH * strip.height) / strip.width;
  const count = Math.ceil(height / tile);
  return (
    <View
      pointerEvents="none"
      style={[styles.edge, side === 'left' ? styles.left : styles.right]}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {Array.from({ length: count }, (_, index) => (
        <Image
          key={index}
          source={strip.source}
          resizeMode="stretch"
          // Alternate tiles are turned over, so the seam between two is the same edge met twice.
          style={{ position: 'absolute', top: index * tile, width: DEPTH, height: tile, tintColor: mixColors(colors.desk, '#000000', 0.35), transform: [{ scaleY: index % 2 ? -1 : 1 }] }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  edge: { position: 'absolute', top: 0, bottom: 0, width: DEPTH, overflow: 'hidden' },
  left: { left: 0 },
  right: { right: 0, transform: [{ scaleX: -1 }] },
});
