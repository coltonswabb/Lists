import type { FC } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { finials } from '../art';
import type { ThemeName } from '../theme';

/** The darkest paper keeps its rods in iron; the rest are brass. */
const metalOf = (paper: ThemeName) => (paper === 'vigil' ? 'iron' : 'brass');

/** Whether a paper's end caps have been painted. Without them, callers draw their own plain ones. */
export const hasFinial = (paper: ThemeName) => finials[metalOf(paper)] !== undefined;

type FinialProps = {
  paper: ThemeName;
  /** Which end of the rod this caps. The painting points left, and is turned over for the right. */
  side: 'left' | 'right';
  /** Length in points, from the bead to the collar. */
  length: number;
  /** How much of the collar end is slid under the roll beside it. */
  tuck: number;
  style?: StyleProp<ImageStyle>;
};

/** A turned end cap on a scroll's rod: the rod is thinner than the roll, so this is the part that shows. */
export const Finial: FC<FinialProps> = ({ paper, side, length, tuck, style }) => {
  const art = finials[metalOf(paper)];
  if (!art) return null;
  return (
    <Image
      source={art.source}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: length, height: (length * art.height) / art.width },
        side === 'left' ? { marginRight: -tuck } : { marginLeft: -tuck, transform: [{ scaleX: -1 }] },
        style,
      ]}
    />
  );
};
