import { type FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const WIDTH = 18;
/** How far the stem sways to either side of the middle of its strip, and over what length it sways once. */
const SWAY = 3.2;
const WAVE = 46;
/** A leaf every so far up the stem, on alternate sides; a berry at every third. */
const LEAF_EVERY = 24;

type MarginVineProps = {
  /** The height of the sheet the vine climbs. */
  height: number;
  /** How much of the scroll is done, 0 to 1: the vine has climbed that share of the sheet. */
  share: number;
  stem: string;
  leaf: string;
  berry: string;
};

const stemAt = (y: number) => WIDTH / 2 + Math.sin((y / WAVE) * Math.PI * 2) * SWAY;

/**
 * A vine in the margin of an open scroll, as an illuminator fills a margin with growing things. It climbs
 * from the foot of the sheet as lines are struck and reaches the head when the scroll is finished, putting
 * out a leaf at each step and a gilded berry now and then. Never touchable.
 */
export const MarginVine: FC<MarginVineProps> = ({ height, share, stem, leaf, berry }) => {
  const drawn = useMemo(() => {
    const top = height - Math.max(0, Math.min(1, share)) * height;
    if (height <= 0 || top >= height - 6) return null;
    let line = `M ${stemAt(height)} ${height}`;
    for (let y = height - 5; y > top; y -= 5) line += ` L ${stemAt(y).toFixed(1)} ${y.toFixed(1)}`;
    line += ` L ${stemAt(top).toFixed(1)} ${top.toFixed(1)}`;
    const leaves: string[] = [];
    const berries: { x: number; y: number }[] = [];
    let count = 0;
    for (let y = height - LEAF_EVERY / 2; y > top + 6; y -= LEAF_EVERY) {
      const x = stemAt(y);
      const side = count % 2 === 0 ? 1 : -1;
      // A small pointed leaf, springing from the stem and curving up and away from it.
      leaves.push(`M ${x} ${y} Q ${x + side * 6.5} ${y - 1} ${x + side * 6} ${y - 8.5} Q ${x + side * 1} ${y - 6.5} ${x} ${y} Z`);
      if (count % 3 === 2) berries.push({ x: x - side * 3.4, y: y - 3 });
      count += 1;
    }
    return { line, leaves: leaves.join(' '), berries, top };
  }, [height, share]);

  if (!drawn) return null;
  return (
    <View pointerEvents="none" style={[styles.strip, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={WIDTH} height={height}>
        <Path d={drawn.line} stroke={stem} strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.7} />
        <Path d={drawn.leaves} fill={leaf} opacity={0.78} />
        {drawn.berries.map((at) => (
          <Circle key={`${at.x}-${at.y}`} cx={at.x} cy={at.y} r={1.9} fill={berry} />
        ))}
        {/* The growing tip: a bud of gold at the top of the stem. */}
        <Circle cx={stemAt(drawn.top)} cy={drawn.top} r={2.2} fill={berry} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: { position: 'absolute', top: 0, right: 5, width: WIDTH },
});
