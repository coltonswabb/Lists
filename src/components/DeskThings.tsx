import { type FC, useEffect } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
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
};

/**
 * The scribe's things, low on the Library's desk: a lit candle, and an inkwell whose quill is the
 * visible way to start a scroll. Tapping it dips the quill, and the candle gutters in the draught.
 */
export const DeskThings: FC<DeskThingsProps> = ({ scrolls, onPen }) => {
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();
  const still = useReducedMotion();
  const { inkwell, candle } = deskProps;

  // Two slow waves of different lengths never quite line up, so the flame doesn't visibly loop.
  const waver = useSharedValue(0);
  const flutter = useSharedValue(0);
  const flare = useSharedValue(0);
  const dip = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    waver.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
    flutter.value = withRepeat(withTiming(1, { duration: 430, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [still, waver, flutter]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${(waver.value - 0.5) * 9 + (flutter.value - 0.5) * 4 + flare.value * 14}deg` },
      { scaleY: 0.94 + flutter.value * 0.1 + waver.value * 0.06 - flare.value * 0.25 },
      { scaleX: 1 - flutter.value * 0.06 + flare.value * 0.12 },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.75 + flutter.value * 0.15 + waver.value * 0.1 - flare.value * 0.3 }));
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
        <View pointerEvents="none" style={{ width: CANDLE, height: candleHeight }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
        </View>
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

const styles = StyleSheet.create({
  things: {
    position: 'absolute',
    left: 22,
    right: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  flame: { position: 'absolute', width: FLAME.width, height: FLAME.height },
  clip: { position: 'absolute', overflow: 'hidden' },
});
