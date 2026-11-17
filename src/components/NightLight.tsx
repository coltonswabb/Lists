import { type FC, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
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
import Svg, { Defs, FeGaussianBlur, Filter, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** The window's lights, as drawn before they are thrown across the room: two pointed lancets and an oculus. */
const WINDOW = { width: 220, height: 380 };
/** The lead and stone between panes, in the window's own units. */
const BAR = 5;
/** How long between one thing flying past the window and the next, and how long it takes to cross. */
const FLIGHT_EVERY_MS = 17000;
const FLIGHT_MS = 2600;

/**
 * One pointed lancet from its springing line down: an equilateral arch, as a gothic window's is, so
 * each side is struck from the other's foot. Cut across by transoms where the lead holds the glass.
 */
const lancet = (x: number, top: number, w: number, bottom: number) => {
  const spring = top + w * 0.87;
  const outline = `M ${x} ${bottom} L ${x} ${spring} A ${w} ${w} 0 0 1 ${x + w / 2} ${top} A ${w} ${w} 0 0 1 ${x + w} ${spring} L ${x + w} ${bottom} Z`;
  // Transoms: thin bands of dark across the light, which the even-odd fill cuts out of the pane.
  const bars = [0.42, 0.66, 0.86]
    .map((at) => {
      const y = spring + (bottom - spring) * at;
      return `M ${x - 1} ${y} L ${x + w + 1} ${y} L ${x + w + 1} ${y + BAR} L ${x - 1} ${y + BAR} Z`;
    })
    .join(' ');
  // And the upright that halves each light.
  const mid = `M ${x + w / 2 - BAR / 2} ${spring + 8} L ${x + w / 2 + BAR / 2} ${spring + 8} L ${x + w / 2 + BAR / 2} ${bottom + 1} L ${x + w / 2 - BAR / 2} ${bottom + 1} Z`;
  return `${outline} ${bars} ${mid}`;
};

/** A round oculus above the lancets, quartered by its tracery. */
const oculus = (cx: number, cy: number, r: number) => {
  const ring = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  const across = `M ${cx - r - 1} ${cy - BAR / 2} L ${cx + r + 1} ${cy - BAR / 2} L ${cx + r + 1} ${cy + BAR / 2} L ${cx - r - 1} ${cy + BAR / 2} Z`;
  const down = `M ${cx - BAR / 2} ${cy - r - 1} L ${cx + BAR / 2} ${cy - r - 1} L ${cx + BAR / 2} ${cy + r + 1} L ${cx - BAR / 2} ${cy + r + 1} Z`;
  return `${ring} ${across} ${down}`;
};

const PANES = [lancet(14, 100, 88, 372), lancet(118, 100, 88, 372), oculus(WINDOW.width / 2, 52, 32)].join(' ');

/**
 * How the room is lit by night, laid on the desk beneath the scrolls: moonlight through a high gothic window, falling
 * in a faint shaft and landing on the open desk in the window's own shape, cool, dimming a little as thin cloud
 * crosses the moon and creeping very slowly across the wood; and the candle's warm light pooling in the
 * lower corner, rising and falling as its flame does. Never touchable.
 */
export const NightLight: FC = () => {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const breath = useSharedValue(0);
  const gutter = useSharedValue(0);
  // Thin cloud crossing the moon, and the slow creep of its light across the desk.
  const cloud = useSharedValue(0);
  const creep = useSharedValue(0);
  const flight = useSharedValue(0);
  const beat = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    // Two unequal rhythms, as the candle's own flame has, so the light never visibly repeats.
    breath.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
    gutter.value = withRepeat(
      withSequence(withTiming(1, { duration: 430, easing: Easing.inOut(Easing.quad) }), withTiming(0.2, { duration: 610 })),
      -1,
      true,
    );
    // Two long, unequal swells, so the moonlight dims and returns without ever seeming to pulse.
    cloud.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
    creep.value = withRepeat(withTiming(1, { duration: 17000, easing: Easing.inOut(Easing.sin) }), -1, true);
    // Now and then something flies past the window outside, and its shadow crosses the light on the desk.
    flight.value = withRepeat(
      withSequence(withDelay(FLIGHT_EVERY_MS, withTiming(1, { duration: FLIGHT_MS, easing: Easing.inOut(Easing.quad) })), withTiming(0, { duration: 0 })),
      -1,
      false,
    );
    beat.value = withRepeat(withTiming(1, { duration: 210, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, breath, gutter, cloud, creep, flight, beat]);

  const moonStyle = useAnimatedStyle(() => ({
    opacity: 1 - cloud.value * 0.45 + creep.value * 0.06,
    transform: [{ translateX: (creep.value - 0.5) * 22 }, { translateY: (creep.value - 0.5) * 9 }],
  }));

  const candleStyle = useAnimatedStyle(() => ({
    opacity: 0.78 + breath.value * 0.14 + gutter.value * 0.08,
    transform: [{ scale: 1 + breath.value * 0.03 }],
  }));

  // The shadow of a bat crossing the moonlit patch, wings beating: there for a moment, then gone for a good while.
  const flightStyle = useAnimatedStyle(() => {
    const along = flight.value;
    return {
      opacity: Math.sin(along * Math.PI) * 0.62,
      transform: [
        { translateX: width * 0.34 + along * width * 0.56 },
        { translateY: height * 0.74 - along * height * 0.2 - Math.sin(along * Math.PI) * 26 },
        { rotate: '-16deg' },
        { scaleY: 0.55 + beat.value * 0.45 },
      ],
    };
  });

  // The patch of moonlight on the desk: below where the scrolls usually lie, on the right, where the desk is open.
  const land = { x: width * 0.42, y: height * 0.5, w: width * 0.42, h: height * 0.26 };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, moonStyle]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="moonbeam" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#d4ddff" stopOpacity={0.26} />
            <Stop offset="0.6" stopColor="#b9c7ff" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#9fb2ff" stopOpacity={0.06} />
          </LinearGradient>
          {/* Light through a window is never sharp-edged by the time it reaches the desk. */}
          <Filter id="soften" x="-10%" y="-10%" width="120%" height="120%">
            <FeGaussianBlur stdDeviation={2.4} />
          </Filter>
          <LinearGradient id="shaft" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#b8c8ff" stopOpacity={0.09} />
            <Stop offset="0.7" stopColor="#b8c8ff" stopOpacity={0.02} />
            <Stop offset="1" stopColor="#b8c8ff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* The haze the light crosses on its way down, from the high window off to the upper right to where it lands. */}
        <Path
          d={`M ${width} ${-10} L ${width} ${height * 0.12} L ${land.x + land.w * 0.9} ${land.y + land.h} L ${land.x - land.w * 0.15} ${land.y + land.h * 0.75} L ${width * 0.55} ${-10} Z`}
          fill="url(#shaft)"
        />
        {/* Where it lands: the window's own shape laid on the open desk, slanted, the stone between the panes left dark. */}
        <G transform={`translate(${land.x} ${land.y}) skewX(-20) rotate(-8) scale(${land.w / WINDOW.width} ${land.h / WINDOW.height})`}>
          <Path d={PANES} fill="url(#moonbeam)" fillRule="evenodd" filter="url(#soften)" />
        </G>
      </Svg>
      </Animated.View>
      {still ? null : (
        <Animated.View style={[styles.flight, flightStyle]}>
          <Svg width={66} height={33} viewBox="0 0 44 22">
            <Defs>
              <Filter id="flightsoften" x="-20%" y="-30%" width="140%" height="160%">
                <FeGaussianBlur stdDeviation={1.3} />
              </Filter>
            </Defs>
            {/* A bat seen from below: two scalloped wings from a small body. */}
            <Path
              d="M22 9 C 20 5, 17 4, 14 6 C 11 2, 6 2, 1 6 C 5 7, 7 9, 8 12 C 11 10, 14 11, 16 14 C 18 12, 20 12, 22 15 C 24 12, 26 12, 28 14 C 30 11, 33 10, 36 12 C 37 9, 39 7, 43 6 C 38 2, 33 2, 30 6 C 27 4, 24 5, 22 9 Z"
              fill="#02030a"
              filter="url(#flightsoften)"
            />
          </Svg>
        </Animated.View>
      )}
      <Animated.View style={[styles.candle, { width: width * 1.5, height: width * 1.5, left: -width * 0.6, top: height - width * 1.05 }, candleStyle]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="candlepool" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#ffb44c" stopOpacity={0.34} />
              <Stop offset="0.3" stopColor="#ff9e36" stopOpacity={0.15} />
              <Stop offset="0.65" stopColor="#ff8c22" stopOpacity={0.04} />
              <Stop offset="1" stopColor="#ff8c22" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#candlepool)" />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  candle: { position: 'absolute' },
  flight: { position: 'absolute', left: 0, top: 0, width: 66, height: 33 },
});
