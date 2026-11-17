import { type FC, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { waxSeal } from '../art';
import { thud } from '../haptics';
import { play } from '../sounds';
import { WaxSeal } from './WaxSeal';

const SIZE = 150;
/** The pause before the seal comes down, so it follows the last strike rather than landing on it. */
const WAIT_MS = 260;
const DROP_MS = 190;
const REST_MS = 760;
const LIFT_MS = 320;

/**
 * The moment a scroll is finished: the wax seal comes down on the page from above, lands with a
 * thud, spreads a little under the press, rests, and is taken away. Never touchable.
 */
export const SealPress: FC<{ onDone: () => void; flare?: string }> = ({ onDone, flare }) => {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  // 0 is held high above the page, 1 is pressed onto it.
  const press = useSharedValue(still ? 1 : 0);
  const squash = useSharedValue(1);
  const shown = useSharedValue(0);
  // A light that breaks from under the seal as it lands, for a scroll whose finishing is more than a sealing.
  const burst = useSharedValue(0);

  useEffect(() => {
    const land = () => {
      thud();
      // Played low, so the same sound that strikes a line lands with more weight.
      play('seal', 0.62);
    };
    shown.value = withSequence(
      withDelay(WAIT_MS, withTiming(1, { duration: still ? 200 : 90 })),
      withDelay(DROP_MS + REST_MS, withTiming(0, { duration: LIFT_MS }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      })),
    );
    if (still) {
      const timer = setTimeout(land, WAIT_MS);
      return () => clearTimeout(timer);
    }
    press.value = withDelay(
      WAIT_MS,
      withTiming(1, { duration: DROP_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(land);
      }),
    );
    // The wax gives under the press and springs back.
    burst.value = withDelay(WAIT_MS + DROP_MS, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    squash.value = withDelay(WAIT_MS + DROP_MS, withSequence(withTiming(1.1, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 240 })));
    return undefined;
    // Played once, when the seal is brought out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sealStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: (2.5 - press.value * 1.5) * squash.value }, { rotate: `${(1 - press.value) * -22 - 6}deg` }],
  }));
  // The seal's shadow tightens and darkens as it nears the page.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: shown.value * (0.1 + press.value * 0.26),
    transform: [{ scale: 1.5 - press.value * 0.42 }],
  }));

  const flareStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(burst.value * Math.PI) * 0.55,
    transform: [{ scale: 0.6 + burst.value * 3.4 }],
  }));

  if (!waxSeal) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.place, { left: width / 2 - SIZE / 2, top: height * 0.42 - SIZE / 2 }]}>
        {flare ? <Animated.View style={[styles.flare, { backgroundColor: flare, shadowColor: flare }, flareStyle]} /> : null}
        <Animated.View style={[styles.shadow, shadowStyle]} />
        <Animated.View style={sealStyle}>
          <WaxSeal size={SIZE} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  place: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  flare: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE, shadowOpacity: 1, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  shadow: {
    position: 'absolute',
    width: SIZE * 0.8,
    height: SIZE * 0.8,
    borderRadius: SIZE,
    top: SIZE * 0.1,
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
});
