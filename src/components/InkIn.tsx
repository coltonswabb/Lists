import { type FC, type ReactNode, useEffect } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

type InkInProps = {
  width: number;
  height: number;
  /** How long to wait before the pen starts, in milliseconds. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

const DRAW_MS = 950;

/**
 * Brings a drawing onto the page as if it were being drawn: revealed from left to right while the
 * ink comes up, rather than appearing whole. The space it will fill is held from the start, so
 * nothing around it moves. Under Reduce Motion it is simply there.
 */
export const InkIn: FC<InkInProps> = ({ width, height, delay = 0, style, children }) => {
  const still = useReducedMotion();
  const drawn = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) return;
    drawn.value = withDelay(delay, withTiming(1, { duration: DRAW_MS, easing: Easing.out(Easing.quad) }));
    // Drawn once, when it first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const penStyle = useAnimatedStyle(() => ({ width: drawn.value * width, opacity: Math.min(1, drawn.value * 1.8) }));

  return (
    <View style={[{ width, height }, style]}>
      <Animated.View style={[styles.reveal, { height }, penStyle]}>
        <View style={{ width, height }}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  reveal: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
});
