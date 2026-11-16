import { LinearGradient } from 'expo-linear-gradient';
import { type FC, useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { celestial, drawings, skies } from '../art';
import { LineArt } from './LineArt';

const FALL_MS = 480;
const HOLD_MS = 1150;
const LIFT_MS = 620;
const WHOLE_MS = FALL_MS + HOLD_MS + LIFT_MS;

/** Each sky: the plain tones it falls back to, and the ink its wheel and corner-work are drawn in. */
const looks = {
  night: { tones: ['#04060d', '#0e1430', '#1b2147'], gilt: '#e9c35c', painting: 'night', body: 'moon' },
  day: { tones: ['#f7dc9a', '#f0b560', '#d9783a'], gilt: '#8c3214', painting: 'dawn', body: 'sun' },
} as const;

/** The four corners of the page: the corner-work is drawn for the top left and turned over for the rest. */
const corners = [
  { top: 0, left: 0, flip: [1, 1] },
  { top: 0, right: 0, flip: [-1, 1] },
  { bottom: 0, left: 0, flip: [1, -1] },
  { bottom: 0, right: 0, flip: [-1, -1] },
] as const;

type DayNightVeilProps = {
  /** What the desk is turning to. */
  to: 'night' | 'day';
  /** The sky is fully drawn over the desk: the moment to change the paper beneath it, unseen. */
  onCovered: () => void;
  onDone: () => void;
};

/**
 * The turn between day and night, played over everything when the candle is touched. A painted sky
 * falls across the desk, framed in gilt corner-work; a wheel of stars turns behind the moon or the
 * sun as it climbs to the middle of it; and the sky lifts on the changed paper.
 */
export const DayNightVeil: FC<DayNightVeilProps> = ({ to, onCovered, onDone }) => {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const look = looks[to];
  const painting = skies[look.painting];
  const body = celestial[look.body];
  const wheel = drawings['sky-wheel'];
  const corner = drawings['sky-corner'];

  const veil = useSharedValue(0);
  const turn = useSharedValue(still ? 1 : 0);

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
    if (!still) turn.value = withTiming(1, { duration: WHOLE_MS, easing: Easing.out(Easing.cubic) });
    // Played once, when the veil is put up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wheelSize = Math.min(width * 1.18, height * 0.62);
  const bodySize = wheelSize * 0.52;
  const centre = { x: width / 2, y: height * 0.44 };
  const cornerSize = Math.min(width * 0.5, 230);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(1 - turn.value) * -70}deg` }, { scale: 0.92 + turn.value * 0.08 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, turn.value * 2.2),
    transform: [
      // Up from below the wheel's foot into its middle, settling as it turns upright.
      { translateY: (1 - turn.value) * wheelSize * 0.42 },
      { rotate: `${(1 - turn.value) * (to === 'day' ? -55 : -18)}deg` },
      { scale: 0.82 + turn.value * 0.18 },
    ],
  }));
  const cornerStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, turn.value * 1.6) * 0.9 }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, veilStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={look.tones} style={StyleSheet.absoluteFill} />
      {painting ? <Image source={painting.source} resizeMode="cover" style={[StyleSheet.absoluteFill, { width, height }]} /> : null}

      {wheel ? (
        <Animated.View style={[styles.centred, { left: centre.x - wheelSize / 2, top: centre.y - wheelSize / 2, width: wheelSize, height: wheelSize }, wheelStyle]}>
          <LineArt drawing={wheel} width={wheelSize} color={look.gilt} style={styles.wheel} />
        </Animated.View>
      ) : null}

      {body ? (
        <Animated.View style={[styles.centred, { left: centre.x - bodySize / 2, top: centre.y - bodySize / 2, width: bodySize, height: bodySize }, bodyStyle]}>
          <Image source={body.source} resizeMode="contain" style={{ width: bodySize, height: bodySize }} />
        </Animated.View>
      ) : null}

      {corner
        ? corners.map(({ flip, ...place }) => (
            <Animated.View key={`${flip[0]}${flip[1]}`} style={[styles.corner, place, { transform: [{ scaleX: flip[0] }, { scaleY: flip[1] }] }, cornerStyle]}>
              <View style={styles.cornerInset}>
                <LineArt drawing={corner} width={cornerSize} color={look.gilt} />
              </View>
            </Animated.View>
          ))
        : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  centred: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  wheel: { opacity: 0.8 },
  corner: { position: 'absolute' },
  // Clear of the screen's rounded corners.
  cornerInset: { padding: 14 },
});
