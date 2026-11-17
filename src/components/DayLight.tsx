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
import Svg, { Defs, FeGaussianBlur, Filter, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

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
      opacity: Math.sin(along * Math.PI) * 0.5,
      transform: [
        { translateX: from.x + (to.x - from.x) * along + (mote.across - 0.5) * spread + Math.sin(along * 9 + mote.phase * 20) * 6 },
        { translateY: from.y + (to.y - from.y) * along },
      ],
    };
  });
  return <Animated.View style={[styles.mote, { width: mote.size, height: mote.size, borderRadius: mote.size }, style]} />;
};

/**
 * Shafts of sun let in between the leaves, in two sets that brighten and dim against each other. Each is where
 * it enters at the head of the desk, how wide it is there, and how bright, as shares of the screen's width.
 */
const BEAMS = [
  [
    { at: 0.04, wide: 0.1, light: 0.2 },
    { at: 0.3, wide: 0.07, light: 0.16 },
    { at: 0.52, wide: 0.13, light: 0.22 },
    { at: 0.8, wide: 0.06, light: 0.13 },
  ],
  [
    { at: 0.17, wide: 0.06, light: 0.15 },
    { at: 0.41, wide: 0.05, light: 0.12 },
    { at: 0.67, wide: 0.09, light: 0.19 },
  ],
] as const;

/**
 * How the room is lit by day, laid on the desk beneath the scrolls. Nothing like the night: where the moon
 * throws one still, cold window on the desk, the day fills the room with warmth from the head of the desk and
 * sends shafts of sun down across it between the leaves outside, brightening and dimming as the branch stirs,
 * with dust hanging in them. Never touchable.
 */
/**
 * The day's three lights. Morning comes in pale and low from the left; at midday it stands overhead, at its
 * brightest and whitest; by afternoon it has gone round to the right and deepened to gold.
 */
const LIGHTS = {
  morning: { from: '14%', tone: ['#fff1d0', '#ffe2a6', '#ffd98a'], strength: 0.13, dapple: '#ffe6ad', mirrored: false },
  midday: { from: '50%', tone: ['#fff6e0', '#ffe9b8', '#ffd98a'], strength: 0.15, dapple: '#fff0c8', mirrored: false },
  afternoon: { from: '86%', tone: ['#ffcf7a', '#ffb648', '#f09a2e'], strength: 0.17, dapple: '#ffc35e', mirrored: true },
} as const;

const lightAt = (hour: number) => (hour < 11 ? LIGHTS.morning : hour < 15 ? LIGHTS.midday : LIGHTS.afternoon);

export const DayLight: FC<{ hour: number }> = ({ hour }) => {
  const light = lightAt(hour);
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

  // The two sets of shafts trade brightness as the leaves stir, and lean a little with the branch.
  const nearStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + stir.value * 0.45,
    transform: [{ translateX: (sway.value - 0.5) * 16 }],
  }));
  const farStyle = useAnimatedStyle(() => ({
    opacity: 1 - stir.value * 0.5,
    transform: [{ translateX: (0.5 - sway.value) * 12 }],
  }));

  // How far a shaft has slid sideways by the time it reaches the desk's foot: the sun's slant for the hour.
  const lean = width * (light.from === '50%' ? 0.06 : 0.42);
  // The shafts are spent well above the foot of the desk, where the candle and the inkwell stand in the room's plain light.
  const reach = height * 0.74;
  const shaft = (beam: { at: number; wide: number }) => {
    const left = width * beam.at;
    const right = left + width * beam.wide;
    // Wider at the foot than the head, as light spreads; the far edge leans further than the near one.
    return `M ${left} -20 L ${right} -20 L ${right + lean + width * beam.wide * 1.4} ${reach} L ${left + lean} ${reach} Z`;
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="morning" cx={light.from} cy="0%" r="95%">
            <Stop offset="0" stopColor={light.tone[0]} stopOpacity={light.strength} />
            <Stop offset="0.45" stopColor={light.tone[1]} stopOpacity={light.strength * 0.4} />
            <Stop offset="1" stopColor={light.tone[2]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* The day itself: warmth pouring in from the head of the desk and thinning toward its foot. */}
        <Rect width={width} height={height} fill="url(#morning)" />
      </Svg>
      {BEAMS.map((set, index) => (
        <Animated.View key={index === 0 ? 'near' : 'far'} style={[StyleSheet.absoluteFill, light.mirrored && styles.mirrored, index === 0 ? nearStyle : farStyle]}>
          <Svg width={width} height={height}>
            <Defs>
              {/* A shaft is brightest where it comes in and is lost in the room's own light before it reaches the foot. */}
              <LinearGradient id={`shaft${index}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={light.dapple} stopOpacity={1} />
                <Stop offset="0.55" stopColor={light.dapple} stopOpacity={0.45} />
                <Stop offset="1" stopColor={light.dapple} stopOpacity={0} />
              </LinearGradient>
              <Filter id={`haze${index}`} x="-20%" y="-5%" width="140%" height="110%">
                <FeGaussianBlur stdDeviation={9} />
              </Filter>
            </Defs>
            <G filter={`url(#haze${index})`}>
              {set.map((beam) => (
                <Path key={beam.at} d={shaft(beam)} fill={`url(#shaft${index})`} opacity={beam.light * 0.42} />
              ))}
            </G>
          </Svg>
        </Animated.View>
      ))}
      {still
        ? null
        : MOTES.map((mote) => (
            <Mote
              key={mote.phase}
              drift={drift}
              mote={mote}
              from={{ x: width * (light.mirrored ? 0.8 : 0.2), y: height * 0.12 }}
              to={{ x: width * (light.mirrored ? 0.38 : 0.62), y: height * 0.8 }}
              spread={width * 0.5}
            />
          ))}
    </View>
  );
};

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
  mote: { position: 'absolute', left: 0, top: 0, backgroundColor: '#ffe9b8' },
});
