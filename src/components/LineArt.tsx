import type { FC } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import type { Drawing } from '../art';

type LineArtProps = {
  drawing: Drawing;
  /** Width in points; the height follows the drawing's proportions. */
  width: number;
  /** The ink: the drawing is black on transparency, tinted to this. */
  color: string;
  style?: StyleProp<ImageStyle>;
};

/** One of the pen drawings, in whatever ink suits the paper or desk beneath it. Decorative only. */
export const LineArt: FC<LineArtProps> = ({ drawing, width, color, style }) => (
  <Image
    source={drawing.source}
    style={[{ width, height: (width * drawing.height) / drawing.width, tintColor: color }, style]}
    resizeMode="contain"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  />
);
