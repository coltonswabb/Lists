import type { FC, ReactNode } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { marginalia } from '../art';
import { InkIn } from './InkIn';
import { LEAD_WIDTH } from './RowLead';

/**
 * Stand-ins drawn in code, used only until drawings have been imported (scripts/import-art.py).
 * Line work in ink, with a touch of the accent.
 */
type Drawing = (ink: string, accent: string) => ReactNode;

const snail: Drawing = (ink, accent) => (
  <>
    <Path d="M14 64 C34 67 72 67 100 62 C108 60 110 54 103 51" stroke={ink} strokeWidth={2} fill="none" />
    <Path d="M101 52 L107 34 M96 53 L97 37" stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
    <Circle cx={107} cy={32} r={2.5} fill={ink} />
    <Circle cx={97} cy={35} r={2.5} fill={ink} />
    <Circle cx={58} cy={42} r={21} fill={accent} fillOpacity={0.22} />
    <Path
      d="M58 42 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12 a16 16 0 1 1 16 16 a20 20 0 1 1 -20 -20"
      stroke={ink}
      strokeWidth={2}
      fill="none"
    />
  </>
);

const fish: Drawing = (ink, accent) => (
  <>
    <Path d="M96 40 L113 25 L109 40 L113 55 Z" fill={accent} fillOpacity={0.5} stroke={ink} strokeWidth={2} />
    <Path d="M18 40 C38 16 78 16 96 40 C78 64 38 64 18 40 Z" fill={accent} fillOpacity={0.12} stroke={ink} strokeWidth={2} />
    <Circle cx={32} cy={36} r={2.5} fill={ink} />
    <Path d="M42 29 Q49 40 42 51" stroke={ink} strokeWidth={2} fill="none" />
    <Path
      d="M56 32 q5 4 0 8 M66 30 q5 4 0 8 M76 32 q5 4 0 8 M61 41 q5 4 0 8 M71 41 q5 4 0 8"
      stroke={ink}
      strokeWidth={1.5}
      fill="none"
    />
  </>
);

const bird: Drawing = (ink, accent) => (
  <>
    <Path d="M8 70 L112 70" stroke={ink} strokeWidth={2} strokeLinecap="round" />
    <Path d="M56 60 L54 70 M66 60 L68 70" stroke={ink} strokeWidth={2} />
    <Path d="M32 50 L12 43 L18 52 L10 59 L34 55" fill={ink} fillOpacity={0.15} stroke={ink} strokeWidth={2} />
    <Path d="M30 50 C32 34 50 28 66 32 C80 36 86 48 82 56 C68 64 42 62 30 50 Z" fill={accent} fillOpacity={0.3} stroke={ink} strokeWidth={2} />
    <Path d="M44 46 C54 38 66 41 70 52" stroke={ink} strokeWidth={2} fill="none" />
    <Circle cx={76} cy={28} r={10} fill={accent} fillOpacity={0.3} stroke={ink} strokeWidth={2} />
    <Path d="M85 25 L96 29 L85 32" fill={ink} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
    <Circle cx={79} cy={26} r={1.8} fill={ink} />
  </>
);

const vine: Drawing = (ink, accent) => (
  <>
    <Path d="M8 62 C28 30 48 72 68 42 S98 26 112 18" stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
    <Path d="M26 44 q-10 -12 2 -20 q8 10 -2 20 z" fill={ink} fillOpacity={0.15} stroke={ink} strokeWidth={1.5} />
    <Path d="M50 58 q2 14 14 14 q0 -12 -14 -14 z" fill={ink} fillOpacity={0.15} stroke={ink} strokeWidth={1.5} />
    <Path d="M80 32 q-4 -14 8 -18 q4 12 -8 18 z" fill={ink} fillOpacity={0.15} stroke={ink} strokeWidth={1.5} />
    <Path d="M98 26 q10 6 6 18 q-10 -6 -6 -18 z" fill={ink} fillOpacity={0.15} stroke={ink} strokeWidth={1.5} />
    <Circle cx={40} cy={54} r={3.5} fill={accent} />
    <Circle cx={45} cy={60} r={3.5} fill={accent} />
    <Circle cx={36} cy={60} r={3.5} fill={accent} />
    <Circle cx={92} cy={46} r={3.5} fill={accent} />
    <Circle cx={97} cy={52} r={3.5} fill={accent} />
  </>
);

const drawings: Drawing[] = [snail, fish, bird, vine];

/** A stable number for a string, so a scroll keeps the same drawing. */
const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) | 0, 7);

type MarginaliaProps = {
  /** Chooses the drawing: the same seed always draws the same creature. */
  seed: string;
  ink: string;
  accent: string;
};

/** The sheet's side margins, and the writing column's insets (see FINIS_COLUMN in GestureList). */
const SHEET_INSET = 40;
const COLUMN_START = 16 + LEAD_WIDTH + 12;
const COLUMN_END = 16;
const MAX_WIDTH = 280;
const MAX_HEIGHT = 170;
/** Long enough for an opening scroll to have unrolled this far. */
const INK_AFTER_MS = 420;

/**
 * A drawing for the margin of a finished scroll, after the creatures and vines medieval scribes drew
 * beside their text. Imported pen drawings are tinted with the paper's ink, so they read on every
 * paper; each scroll keeps the same one.
 */
export const Marginalia: FC<MarginaliaProps> = ({ seed, ink, accent }) => {
  const { width: screenWidth } = useWindowDimensions();
  const pick = Math.abs(hash(seed));
  const drawing = marginalia[pick % Math.max(1, marginalia.length)];
  if (drawing) {
    // Wide drawings fill the column; tall ones are held to the same height, so none crowds the page.
    const width = Math.min(
      MAX_WIDTH,
      screenWidth - SHEET_INSET - COLUMN_START - COLUMN_END,
      (MAX_HEIGHT * drawing.width) / drawing.height,
    );
    const height = (width * drawing.height) / drawing.width;
    return (
      // Drawn in once the scroll has unrolled, or once the last line has been struck.
      <InkIn width={width} height={height} delay={INK_AFTER_MS}>
        <Image
          source={drawing.source}
          style={{ width, height, tintColor: ink }}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </InkIn>
    );
  }
  const draw = drawings[pick % drawings.length] ?? snail;
  return (
    <Svg width={120} height={80} viewBox="0 0 120 80" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {draw(ink, accent)}
    </Svg>
  );
};
