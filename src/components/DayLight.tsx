import { type FC, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, FeGaussianBlur, Filter, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { PANES, WINDOW } from './NightLight';

/** How long a mote of dust takes to cross the sunbeam. */
const DRIFT_MS = 26000;

/** Motes of dust in the beam: where along it each starts, how far across it lies, and how big it is. */
const MOTES = [
  { phase: 0.02, across: 0.2, size: 2.5 },
  { phase: 0.17, across: 0.72, size: 2 },
  { phase: 0.31, across: 0.45, size: 3 },
  { phase: 0.46, across: 0.1, size: 2 },
  { phase: 0.58, across: 0.86, size: 2.5 },
  { phase: 0.71, across: 0.55, size: 2 },
  { phase: 0.86, across: 0.3, size: 3 },
] as const;

type MoteProps = {
  drift: SharedValue<number>;
  mote: (typeof MOTES)[number];
  /** Where the beam is entered and where it is left, on the screen. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** How wide the beam is, which the mote's place across it is a share of. */
  spread: number;
};

/** One mote, sinking slowly down the beam: it brightens as it enters the light and dims as it leaves. */
const Mote: FC<MoteProps> = ({ drift, mote, from, to, spread }) => {
  const style = useAnimatedStyle(() => {
    const along = (drift.value + mote.phase) % 1;
    return {
      opacity: Math.sin(along * Math.PI) * 0.7,
      transform: [
        { translateX: from.x + (to.x - from.x) * along + (mote.across - 0.5) * spread + Math.sin(along * 9 + mote.phase * 20) * 6 },
        { translateY: from.y + (to.y - from.y) * along },
      ],
    };
  });
  return <Animated.View style={[styles.mote, { width: mote.size, height: mote.size, borderRadius: mote.size }, style]} />;
};

/**
 * How the room is lit by day, laid on the desk beneath the scrolls: the sun through the same high window
 * the moon uses by night, but from the other side and warm. It falls in a broad shaft, lands on the open
 * desk in the window's shape, and shows the dust that hangs in it. Never touchable.
 */
export const DayLight: FC = () => {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    drift.value = withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false);
  }, [still, drift]);

  // The patch of sunlight on the desk: below where the scrolls usually lie, on the left, clear of the quill.
  const land = { x: width * 0.2, y: height * 0.47, w: width * 0.44, h: height * 0.27 };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sunbeam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffdc8c" stopOpacity={0.4} />
            <Stop offset="0.6" stopColor="#ffc860" stopOpacity={0.27} />
            <Stop offset="1" stopColor="#ffb648" stopOpacity={0.12} />
          </LinearGradient>
          {/* Light through a window is never sharp-edged by the time it reaches the desk. */}
          <Filter id="sunsoften" x="-10%" y="-10%" width="120%" height="120%">
            <FeGaussianBlur stdDeviation={2.4} />
          </Filter>
          <LinearGradient id="sunshaft" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffd98a" stopOpacity={0.17} />
            <Stop offset="0.7" stopColor="#ffd98a" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#ffe2a6" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* The haze the light crosses on its way down, from the high window off to the upper left to where it lands. */}
        <Path
          d={`M 0 ${-10} L 0 ${height * 0.12} L ${land.x + land.w * 0.1} ${land.y + land.h} L ${land.x + land.w * 1.15} ${land.y + land.h * 0.75} L ${width * 0.45} ${-10} Z`}
          fill="url(#sunshaft)"
        />
        {/* Where it lands: the window's own shape laid on the open desk, slanted, the stone between the panes left dark. */}
        <G transform={`translate(${land.x} ${land.y}) skewX(20) rotate(8) scale(${land.w / WINDOW.width} ${land.h / WINDOW.height})`}>
          <Path d={PANES} fill="url(#sunbeam)" fillRule="evenodd" filter="url(#sunsoften)" />
        </G>
      </Svg>
      {still
        ? null
        : MOTES.map((mote) => (
            <Mote
              key={mote.phase}
              drift={drift}
              mote={mote}
              from={{ x: width * 0.16, y: height * 0.1 }}
              to={{ x: land.x + land.w * 0.55, y: land.y + land.h * 0.8 }}
              spread={width * 0.3}
            />
          ))}
    </View>
  );
};

const styles = StyleSheet.create({
  mote: { position: 'absolute', left: 0, top: 0, backgroundColor: '#ffe9b8' },
});
