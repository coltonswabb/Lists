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
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, RadialGradient, Rect, Stop } from 'react-native-svg';

/** How long a mote of dust takes to sink through the light. */
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
 * Gaps between leaves where the sun gets through. Each throws a small round image of the sun, as a pinhole does,
 * and they crowd and overlap along the branch. In the shade's own units.
 */
const SHADE = { width: 300, height: 420 };
const DAPPLES = [
  { x: 80, y: 161, r: 9, light: 0.31 },
  { x: 68, y: 119, r: 11, light: 0.17 },
  { x: 97, y: 120, r: 15, light: 0.17 },
  { x: 205, y: 241, r: 18, light: 0.33 },
  { x: 158, y: 293, r: 9, light: 0.26 },
  { x: 62, y: 81, r: 18, light: 0.22 },
  { x: 191, y: 319, r: 22, light: 0.19 },
  { x: 81, y: 72, r: 18, light: 0.2 },
  { x: 183, y: 235, r: 18, light: 0.33 },
  { x: 97, y: 108, r: 26, light: 0.2 },
  { x: 169, y: 278, r: 22, light: 0.24 },
  { x: 136, y: 239, r: 11, light: 0.3 },
  { x: 72, y: 17, r: 22, light: 0.17 },
  { x: 189, y: 264, r: 13, light: 0.29 },
  { x: 178, y: 226, r: 26, light: 0.18 },
  { x: 117, y: 61, r: 22, light: 0.29 },
  { x: 227, y: 295, r: 13, light: 0.29 },
  { x: 221, y: 393, r: 13, light: 0.19 },
  { x: 26, y: 107, r: 11, light: 0.29 },
  { x: 165, y: 165, r: 11, light: 0.24 },
  { x: 195, y: 262, r: 26, light: 0.26 },
  { x: 239, y: 296, r: 15, light: 0.33 },
  { x: 44, y: 44, r: 11, light: 0.16 },
  { x: 194, y: 282, r: 11, light: 0.24 },
  { x: 127, y: 219, r: 22, light: 0.31 },
  { x: 263, y: 387, r: 15, light: 0.32 },
] as const;

/**
 * How the room is lit by day, laid on the desk beneath the scrolls. Nothing like the night: where the moon
 * throws one still, cold window on the desk, the day fills the room with warmth from the head of the desk and
 * lays the shifting shade of leaves across it, the light between them stirring as the branch outside does,
 * with dust hanging in it. Never touchable.
 */
export const DayLight: FC = () => {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const drift = useSharedValue(0);
  const sway = useSharedValue(0);
  const stir = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    drift.value = withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false);
    // A slow lean of the branch and a quicker stir of its leaves, never quite in step.
    sway.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
    stir.value = withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, drift, sway, stir]);

  const shadeStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + stir.value * 0.15,
    transform: [
      { translateX: (sway.value - 0.5) * 14 + (stir.value - 0.5) * 4 },
      { translateY: (sway.value - 0.5) * 6 },
      { rotate: `${(sway.value - 0.5) * 2.4}deg` },
    ],
  }));

  // The leaf-shade lies across the open middle of the desk, below where the scrolls usually are.
  const shade = { w: width * 0.92, h: height * 0.5 };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="morning" cx="12%" cy="0%" r="95%">
            <Stop offset="0" stopColor="#ffd98a" stopOpacity={0.3} />
            <Stop offset="0.45" stopColor="#ffc766" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#ffb648" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* The day itself: warmth pouring in from the head of the desk and thinning toward its foot. */}
        <Rect width={width} height={height} fill="url(#morning)" />
      </Svg>
      <Animated.View style={[styles.shade, { left: width * 0.04, top: height * 0.36, width: shade.w, height: shade.h }, shadeStyle]}>
        <Svg width={shade.w} height={shade.h} viewBox={`0 0 ${SHADE.width} ${SHADE.height}`}>
          <Defs>
            {/* Light through leaves has no edges by the time it reaches the desk. */}
            <Filter id="leafsoften" x="-30%" y="-30%" width="160%" height="160%">
              <FeGaussianBlur stdDeviation={3.5} />
            </Filter>
          </Defs>
          <G filter="url(#leafsoften)">
            {DAPPLES.map((dapple) => (
              <Circle key={`${dapple.x}-${dapple.y}`} cx={dapple.x} cy={dapple.y} r={dapple.r} fill="#ffd27a" opacity={dapple.light} />
            ))}
          </G>
        </Svg>
      </Animated.View>
      {still
        ? null
        : MOTES.map((mote) => (
            <Mote
              key={mote.phase}
              drift={drift}
              mote={mote}
              from={{ x: width * 0.2, y: height * 0.12 }}
              to={{ x: width * 0.62, y: height * 0.8 }}
              spread={width * 0.5}
            />
          ))}
    </View>
  );
};

const styles = StyleSheet.create({
  shade: { position: 'absolute' },
  mote: { position: 'absolute', left: 0, top: 0, backgroundColor: '#ffe9b8' },
});
