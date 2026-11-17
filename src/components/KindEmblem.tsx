import type { FC } from 'react';

import { kindEmblems } from '../art';
import type { Kind } from '../kinds';
import { LineArt } from './LineArt';

type KindEmblemProps = {
  kind: Kind;
  /** The side of the square the emblem is held within, whatever its own shape. */
  size: number;
  color: string;
};

/** The pen-drawn emblem of a kind of scroll, in whatever ink suits where it is shown. Nothing if it has not been drawn. */
export const KindEmblem: FC<KindEmblemProps> = ({ kind, size, color }) => {
  const emblem = kindEmblems[kind];
  if (!emblem) return null;
  // Wide ones take the full width; tall ones are held to the same height, so all read at one size.
  const width = Math.min(size, (size * emblem.width) / emblem.height);
  return <LineArt drawing={emblem} width={width} color={color} />;
};
