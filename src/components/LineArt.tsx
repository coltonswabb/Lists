import type { FC } from 'react';
import { Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import type { Drawing } from '../art';
import { InkIn } from './InkIn';

type LineArtProps = {
  drawing: Drawing;
  /** Width in points; the height follows the drawing's proportions. */
  width: number;
  /** The ink: the drawing is black on transparency, tinted to this. */
  color: string;
  style?: StyleProp<ImageStyle>;
  /** Draws it in from left to right when it first appears, after this many milliseconds, instead of showing it whole. */
  inkIn?: number;
};

/** One of the pen drawings, in whatever ink suits the paper or desk beneath it. Decorative only. */
export const LineArt: FC<LineArtProps> = ({ drawing, width, color, style, inkIn }) => {
  const height = (width * drawing.height) / drawing.width;
  if (inkIn !== undefined) {
    return (
      // The caller's margins and placing go on the frame that holds the drawing's place.
      <InkIn width={width} height={height} delay={inkIn} style={style as StyleProp<ViewStyle>}>
        <Image source={drawing.source} style={{ width, height, tintColor: color }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </InkIn>
    );
  }
  return (
    <Image
      source={drawing.source}
      style={[{ width, height, tintColor: color }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};
