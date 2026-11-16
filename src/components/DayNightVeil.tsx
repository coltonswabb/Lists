import { LinearGradient } from 'expo-linear-gradient';
import { type FC, useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

const FALL_MS = 420;
const HOLD_MS = 380;
const LIFT_MS = 520;
const BODY = 112;

const skies = {
  night: ['#04060d', '#0e1430', '#1b2147'],
  day: ['#f7dc9a', '#f0b560', '#d9783a'],
} as const;

/** Fixed, so the same few stars come out each night. Fractions of the screen. */
const STARS = [
  [0.12, 0.14, 1.6],
  [0.31, 0.08, 1.1],
  [0.52, 0.19, 1.9],
  [0.74, 0.11, 1.3],
  [0.88, 0.24, 1.5],
  [0.2, 0.33, 1.2],
  [0.63, 0.36, 1.0],
  [0.42, 0.44, 1.4],
  [0.84, 0.48, 1.1],
  [0.09, 0.52, 1.3],
] as const;

type DayNightVeilProps = {
  /** What the desk is turning to. */
  to: 'night' | 'day';
  /** The sky is fully drawn over the desk: the moment to change the paper beneath it, unseen. */
  onCovered: () => void;
  onDone: () => void;
};

/**
 * The turn between day and night, played over everything when the candle is touched: the sky falls
 * across the desk, a moon or a sun climbs through it, and it lifts on the changed paper.
 */
export const DayNightVeil: FC<DayNightVeilProps> = ({ to, onCovered, onDone }) => {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const veil = useSharedValue(0);
  const climb = useSharedValue(0);

  useEffect(() => {
    veil.value = withSequence(
      withTiming(1, { duration: FALL_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onCovered);
      }),
      withDelay(
        HOLD_MS,
        withTiming(0, { duration: LIFT_MS, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(onDone);
        }),
      ),
    );
    climb.value = withTiming(1, { duration: FALL_MS + HOLD_MS + LIFT_MS, easing: Easing.out(Easing.cubic) });
    // Played once, when the veil is put up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const bodyStyle = useAnimatedStyle(() => {
    // An arc from low on the left to high in the middle. Held at its height when motion is reduced.
    const t = still ? 1 : climb.value;
    return {
      transform: [
        { translateX: width * (0.16 + 0.34 * t) - BODY / 2 },
        { translateY: height * (0.62 - 0.3 * Math.sin((t * Math.PI) / 2)) - BODY / 2 },
        { rotate: `${(1 - t) * -24}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, veilStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={skies[to]} style={StyleSheet.absoluteFill} />
      {to === 'night' ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {STARS.map(([x, y, r]) => (
            <Circle key={`${x}-${y}`} cx={x * width} cy={y * height} r={r} fill="#eef0ff" opacity={0.85} />
          ))}
        </Svg>
      ) : null}
      <Animated.View style={[styles.body, bodyStyle]}>
        <Svg width={BODY} height={BODY} viewBox="0 0 100 100">
          {to === 'night' ? (
            // A crescent: a full disc with a bite taken from it.
            <Path d="M62 8 A 44 44 0 1 0 92 62 A 34 34 0 1 1 62 8 Z" fill="#f3ecd2" />
          ) : (
            <G>
              {Array.from({ length: 12 }, (_, ray) => {
                const angle = (ray * Math.PI) / 6;
                const long = ray % 2 === 0;
                return (
                  <Line
                    key={ray}
                    x1={50 + Math.cos(angle) * 30}
                    y1={50 + Math.sin(angle) * 30}
                    x2={50 + Math.cos(angle) * (long ? 48 : 41)}
                    y2={50 + Math.sin(angle) * (long ? 48 : 41)}
                    stroke="#fff3c4"
                    strokeWidth={long ? 4 : 3}
                    strokeLinecap="round"
                  />
                );
              })}
              <Circle cx={50} cy={50} r={24} fill="#fff6d0" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  body: { position: 'absolute', left: 0, top: 0, width: BODY, height: BODY },
});
