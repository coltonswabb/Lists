import { type FC, useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { deskProps } from '../art';
import { ROW_HEIGHT } from '../theme';

const CANDLE = 58;
const INKWELL = 92;
/** Room the things need above the labels at the desk's foot, and what stands over the first scroll. */
const HEIGHT = 130;
const HEADER = 110;
const FOOT = 58;

/** Where the wick ends on the candle's painting, as fractions of its width and height. */
const WICK = { x: 0.575, y: 0.11 };
const FLAME = { width: 15, height: 30 };
const GLOW = 120;
const SMOKE = { width: 14, height: 42 };

/** On the inkwell's painting: the line above which there is only feather, and where the quill meets the ink. */
const FEATHER_ABOVE = 0.545;
const NIB = { x: 0.295, y: 0.625 };
/** Space round the feather so it is not cut off as it swings. */
const SWING = 16;

type DeskThingsProps = {
  /** How many scrolls lie on the shelf: with too many, the things are put away rather than sit on top of them. */
  scrolls: number;
  /** The quill is taken up: start a new scroll. */
  onPen: () => void;
  /** The candle is touched: turn day to night, or night to day. */
  onCandle: () => void;
  /** Whether it is night. The candle burns only by night; by day it stands snuffed. */
  night: boolean;
};

/**
 * The scribe's things, low on the Library's desk: a candle, and an inkwell whose quill is the
 * visible way to start a scroll. Tapping it dips the quill, and the candle gutters in the draught.
 * The candle stands snuffed by day; touching it lights it and night falls, and touching it again
 * snuffs it, with a thread of smoke, and the day comes back.
 */
export const DeskThings: FC<DeskThingsProps> = ({ scrolls, onPen, onCandle, night }) => {
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();
  const still = useReducedMotion();
  const { inkwell, candle } = deskProps;

  // Two slow waves of different lengths never quite line up, so the flame doesn't visibly loop.
  const waver = useSharedValue(0);
  const flutter = useSharedValue(0);
  const flare = useSharedValue(0);
  const dip = useSharedValue(0);
  // How far the flame is alight, 0 to 1, and how far a thread of smoke has risen after snuffing.
  const lit = useSharedValue(night ? 1 : 0);
  const smoke = useSharedValue(1);
  const wasNight = useRef(night);
  useEffect(() => {
    if (wasNight.current === night) return;
    wasNight.current = night;
    if (night) {
      // Caught from the wick: small and low, then standing up to its height.
      lit.value = still ? 1 : withTiming(1, { duration: 520, easing: Easing.out(Easing.back(2)) });
    } else {
      lit.value = still ? 0 : withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) });
      if (!still) {
        smoke.value = 0;
        // The candle is snuffed while the sky covers the desk, so the smoke waits to rise until the sky lifts off it.
        smoke.value = withDelay(950, withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }));
      }
    }
  }, [night, still, lit, smoke]);

  useEffect(() => {
    if (still) return;
    waver.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
    flutter.value = withRepeat(withTiming(1, { duration: 430, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [still, waver, flutter]);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, lit.value * 1.6),
    transform: [
      { scale: lit.value },
      { rotate: `${(waver.value - 0.5) * 9 + (flutter.value - 0.5) * 4 + flare.value * 14}deg` },
      { scaleY: 0.94 + flutter.value * 0.1 + waver.value * 0.06 - flare.value * 0.25 },
      { scaleX: 1 - flutter.value * 0.06 + flare.value * 0.12 },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: lit.value * (0.75 + flutter.value * 0.15 + waver.value * 0.1 - flare.value * 0.3) }));
  // The smoke curls up from the wick, widening and thinning out as it goes.
  const smokeStyle = useAnimatedStyle(() => ({
    opacity: smoke.value >= 1 ? 0 : Math.sin(smoke.value * Math.PI) * 0.7,
    // Held at its foot on the wick, so it rises and spreads from there rather than drifting off it.
    transformOrigin: '50% 100%',
    transform: [{ translateY: -smoke.value * 12 }, { translateX: smoke.value * 3 }, { scale: 0.8 + smoke.value * 0.45 }],
  }));
  const featherStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dip.value * 3 }, { rotate: `${dip.value * -9}deg` }],
  }));

  const room = screen - insets.top - HEADER - scrolls * ROW_HEIGHT - (insets.bottom + FOOT);
  if (room < HEIGHT) return null;

  const pen = () => {
    if (!still) {
      // Down into the ink, a shake, and up again; the candle leans away and recovers.
      dip.value = withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(-0.5, { duration: 150 }),
        withTiming(0.45, { duration: 130 }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }),
      );
      flare.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
    }
    onPen();
  };

  const candleHeight = candle ? (CANDLE * candle.height) / candle.width : 0;
  const inkHeight = inkwell ? (INKWELL * inkwell.height) / inkwell.width : 0;
  const split = inkHeight * FEATHER_ABOVE;

  return (
    <View pointerEvents="box-none" style={[styles.things, { bottom: insets.bottom + FOOT }]}>
      {candle ? (
        <Pressable
          onPress={() => {
            if (!still) flare.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
            onCandle();
          }}
          hitSlop={10}
          accessibilityRole="switch"
          accessibilityLabel="Candle"
          accessibilityHint={night ? "Snuffs it, and the day returns" : "Lights it for night, to plan the morrow"}
          accessibilityState={{ checked: night }}
          style={{ width: CANDLE, height: candleHeight }}
        >
          <GroundShadow width={CANDLE * 1.7} left={-CANDLE * 0.35} top={candleHeight - 13} />
          <Animated.View
            style={[styles.glow, { left: CANDLE * WICK.x - GLOW / 2, top: candleHeight * WICK.y - GLOW / 2 - FLAME.height / 2 }, glowStyle]}
          >
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#ffb648" stopOpacity={0.42} />
                  <Stop offset="0.45" stopColor="#ff9a2e" stopOpacity={0.14} />
                  <Stop offset="1" stopColor="#ff8a1e" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={GLOW / 2} cy={GLOW / 2} rx={GLOW / 2} ry={GLOW / 2} fill="url(#glow)" />
            </Svg>
          </Animated.View>
          <Image source={candle.source} style={{ width: CANDLE, height: candleHeight }} />
          <Animated.View
            style={[
              styles.flame,
              { left: CANDLE * WICK.x - FLAME.width / 2, top: candleHeight * WICK.y - FLAME.height + 3, transformOrigin: [FLAME.width / 2, FLAME.height, 0] },
              flameStyle,
            ]}
          >
            <Svg width={FLAME.width} height={FLAME.height} viewBox="0 0 30 60">
              <Defs>
                <RadialGradient id="flame" cx="50%" cy="72%" r="60%">
                  <Stop offset="0" stopColor="#fff6d6" />
                  <Stop offset="0.35" stopColor="#ffd45e" />
                  <Stop offset="0.8" stopColor="#ff9320" />
                  <Stop offset="1" stopColor="#e2570f" stopOpacity={0.85} />
                </RadialGradient>
              </Defs>
              {/* A teardrop leaning a little, as a flame does: full at the foot, drawn to a point. */}
              <Path d="M15 1 C 17 15, 28 26, 27 41 C 26 52, 21 59, 15 59 C 9 59, 4 52, 3 41 C 2 28, 12 17, 15 1 Z" fill="url(#flame)" />
              <Path d="M15 34 C 17 40, 21 44, 20 50 C 19 55, 17 57, 15 57 C 13 57, 11 55, 10 50 C 9 45, 13 40, 15 34 Z" fill="#5a78c8" opacity={0.35} />
            </Svg>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.smoke, { left: CANDLE * WICK.x - SMOKE.width / 2 - 2, top: candleHeight * WICK.y - SMOKE.height + 3 }, smokeStyle]}
          >
            <Svg width={SMOKE.width} height={SMOKE.height} viewBox="0 0 20 60">
              {/* A broad faint haze about a thin bright thread, so it reads as smoke and not a drawn line. */}
              <Path d="M10 60 C 4 50, 16 44, 10 34 C 4 24, 15 18, 9 8 C 7 4, 10 1, 12 0" stroke="#e4ded2" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.18} />
              <Path d="M10 60 C 4 50, 16 44, 10 34 C 4 24, 15 18, 9 8 C 7 4, 10 1, 12 0" stroke="#e4ded2" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.7} />
            </Svg>
          </Animated.View>
        </Pressable>
      ) : (
        <View />
      )}
      {inkwell ? (
        <Pressable
          onPress={pen}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Pen a new scroll"
          style={{ width: INKWELL, height: inkHeight }}
        >
          <GroundShadow width={INKWELL * 0.95} left={-INKWELL * 0.12} top={inkHeight - 14} />
          {/* The pot stays put; only the feather above its rim moves, hinged where the quill meets the ink. */}
          <View style={[styles.clip, { top: split, height: inkHeight - split, width: INKWELL }]}>
            <Image source={inkwell.source} style={{ width: INKWELL, height: inkHeight, marginTop: -split }} />
          </View>
          <View style={[styles.clip, { top: -SWING, left: -SWING, height: split + SWING, width: INKWELL + SWING * 2 }]}>
            <Animated.Image
              source={inkwell.source}
              style={[
                { width: INKWELL, height: inkHeight, marginTop: SWING, marginLeft: SWING, transformOrigin: [INKWELL * NIB.x, inkHeight * NIB.y, 0] },
                featherStyle,
              ]}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
};

/**
 * The shadow a thing standing on the desk throws round its foot: darkest where it touches the wood and gone
 * within a hand's breadth. Without it, a thing lit from above looks as if it hangs over the desk.
 */
const GroundShadow: FC<{ width: number; left: number; top: number }> = ({ width, left, top }) => {
  const height = Math.round(width * 0.3);
  return (
    <View pointerEvents="none" style={[styles.shadow, { width, height, left, top }]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="ground" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.62} />
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="url(#ground)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: { position: 'absolute' },
  things: {
    position: 'absolute',
    left: 22,
    right: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  smoke: { position: 'absolute', width: SMOKE.width, height: SMOKE.height },
  flame: { position: 'absolute', width: FLAME.width, height: FLAME.height },
  clip: { position: 'absolute', overflow: 'hidden' },
});
