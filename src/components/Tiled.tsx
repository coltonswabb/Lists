import { type FC, useState } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

type TiledProps = {
  source: ImageSourcePropType;
  /** The side of one square tile, in points. */
  tile: number;
  opacity?: number;
  /** Recolours a black-on-transparency tile, such as a scatter of stars. */
  tint?: string;
};

/**
 * Fills its parent with an image laid edge to edge. Done by hand because an Image's own "repeat"
 * resize mode shows only a single tile on iOS. Decorative only, and never touchable.
 */
export const Tiled: FC<TiledProps> = ({ source, tile, opacity = 1, tint }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < size.height; y += tile) for (let x = 0; x < size.width; x += tile) tiles.push({ x, y });
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip, { opacity }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== size.width || height !== size.height) setSize({ width, height });
      }}
    >
      {tiles.map(({ x, y }) => (
        <Image key={`${x},${y}`} source={source} style={{ position: 'absolute', left: x, top: y, width: tile, height: tile, tintColor: tint }} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
