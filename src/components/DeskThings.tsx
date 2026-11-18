import { type FC, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
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

import { nearProps } from '../art';
import { usePaneWidth } from '../PaneWidth';
import { ROW_HEIGHT } from '../theme';

/**
 * The things stand close, at the foot of the screen: large, and running off its corners, as things nearest
 * the eye do. Their sizes, and how far each is let run off its side.
 */
const CANDLE = 100;
// A goose quill is three or four times the height of a small inkpot.
const INKPOT = 96;
const QUILL = 196;
const CANDLE_OFF = 14;
const INKWELL_OFF = -6;
/** How much of each is let sink below the foot of the screen: the candlestick's pan, and the belly of the pot. */
const CANDLE_SINK = 0.12;
const INKPOT_SINK = 0.34;
/** How far the things rise above the labels at the desk's foot, and what stands over the first scroll. */
const HEIGHT = 100;
const HEADER = 110;
/** The height the labels take at the foot of the shelf, above the bottom inset: two short rows. */
export const FOOT = 76;

/** On the candle's painting: where its wick stands, as fractions of its width and height. */
const WICK = { x: 0.405, y: 0.165 };
/** The flame is painted with its own wick at its foot, which is set over the candle's. Its size, and its glow. */
const FLAME = { width: 21, height: 21 * (480 / 146) };
const GLOW = 210;
const SMOKE = { width: 22, height: 66 };

/**
 * On the inkpot's painting: where the quill's nib rests, below the ink in the middle of the mouth, and the line of
 * the ink's surface there. The pot below that line is drawn again over the quill, so the shaft goes down into the ink.
 */
const MOUTH = { x: 0.5, y: 0.27 };
const INK_LINE = 0.2;
/** How much further it leans than it was painted: outward, toward the corner and off the side of the screen. */
const QUILL_LEAN = 3;
/** On the quill's painting, as painted (leaning right): where its nib is, which it turns about. */
const NIB = { x: 0.05, y: 0.99 };

/** Whether the shelf holds too many scrolls for the things to stand below them at their full size. */
export const isCrowded = (screen: number, top: number, bottom: number, scrolls: number) =>
  screen - top - HEADER - scrolls * ROW_HEIGHT - (bottom + FOOT) < HEIGHT;

/**
 * The room the things take at the foot of a crowded shelf, which the shelf leaves clear so that no scroll lies
 * under them and they stand in the same place, at the same size, on every shelf. The candle is the way back to day and the quill the way to a new scroll, so they are never put away.
 */
export const CROWDED_ROOM = HEIGHT + 10;

type DeskThingsProps = {
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
export const DeskThings: FC<DeskThingsProps> = ({ onPen, onCandle, night }) => {
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  // Beside an open scroll on a wide screen the shelf's pane ends in the middle of the screen: the inkwell stands
  // whole at that edge, and only runs off a real edge of the screen.
  const { width: windowWidth } = useWindowDimensions();
  const atScreenEdge = usePaneWidth() >= windowWidth - 1;
  const { candle, flame, inkpot, quill } = nearProps;

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
    // Leaning out toward the corner, and dipped into the ink and out again when touched.
    transform: [{ translateY: dip.value * 5 }, { rotate: `${QUILL_LEAN - dip.value * 9}deg` }],
  }));
  const warmthStyle = useAnimatedStyle(() => ({ opacity: lit.value * (0.22 + flutter.value * 0.05 + waver.value * 0.04) }));


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
  const potHeight = inkpot ? (INKPOT * inkpot.height) / inkpot.width : 0;
  const quillWidth = quill ? (QUILL * quill.width) / quill.height : 0;
  // The quill's nib rests in the ink in the pot's mouth; what lies below the ink's surface is hidden by the pot.
  const nib = { x: INKPOT * MOUTH.x, y: QUILL * NIB.y };
  const potTop = nib.y - potHeight * MOUTH.y;
  const inkwellHeight = potTop + potHeight;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <View
      pointerEvents="box-none"
      style={[styles.things, { bottom: 0, left: -CANDLE_OFF, right: atScreenEdge ? -INKWELL_OFF : 8 }]}
    >
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
          style={{ width: CANDLE, height: candleHeight, marginBottom: -candleHeight * CANDLE_SINK }}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { left: CANDLE * WICK.x - GLOW / 2, top: candleHeight * WICK.y - GLOW / 2 - FLAME.height * 0.45 }, glowStyle]}
          >
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#ffb648" stopOpacity={0.4} />
                  <Stop offset="0.45" stopColor="#ff9a2e" stopOpacity={0.12} />
                  <Stop offset="1" stopColor="#ff8a1e" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={GLOW / 2} cy={GLOW / 2} rx={GLOW / 2} ry={GLOW / 2} fill="url(#glow)" />
            </Svg>
          </Animated.View>
          <Image source={candle.source} style={{ width: CANDLE, height: candleHeight }} />
          {/* By night the candle's light falls warm across its own wax and iron. */}
          <Animated.Image
            source={candle.source}
            style={[styles.warmth, { width: CANDLE, height: candleHeight, tintColor: '#ffa04a' }, warmthStyle]}
          />
          {flame ? (
            <Animated.Image
              source={flame.source}
              style={[
                styles.flame,
                {
                  width: FLAME.width,
                  height: FLAME.height,
                  left: CANDLE * WICK.x - FLAME.width / 2,
                  top: candleHeight * WICK.y - FLAME.height * 0.97,
                  transformOrigin: [FLAME.width / 2, FLAME.height * 0.97, 0],
                },
                flameStyle,
              ]}
            />
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[styles.smoke, { left: CANDLE * WICK.x - SMOKE.width / 2, top: candleHeight * WICK.y - SMOKE.height }, smokeStyle]}
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
      {inkpot && quill ? (
        <Pressable
          onPress={pen}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Pen a new scroll"
          style={{ width: INKPOT, height: inkwellHeight, marginBottom: -potHeight * INKPOT_SINK }}
        >
          <Image source={inkpot.source} style={[styles.pot, { top: potTop, width: INKPOT, height: potHeight }]} />
          {/* The quill stands in the ink, leaning out toward the corner, hinged at its nib. */}
          <Animated.Image
            source={quill.source}
            style={[
              styles.quill,
              {
                width: quillWidth,
                height: QUILL,
                left: nib.x - quillWidth * NIB.x,
                top: nib.y - QUILL * NIB.y,
                transformOrigin: [quillWidth * NIB.x, QUILL * NIB.y, 0],
              },
              featherStyle,
            ]}
          />
          {/* The ink and the near side of the pot, from the ink's surface down, over the quill's shaft. */}
          <View pointerEvents="none" style={[styles.clip, { top: potTop + potHeight * INK_LINE, width: INKPOT, height: potHeight * (1 - INK_LINE) }]}>
            <Image source={inkpot.source} style={{ width: INKPOT, height: potHeight, marginTop: -potHeight * INK_LINE }} />
          </View>
        </Pressable>
      ) : null}
    </View>
      {/* The foot of the screen falls away into shadow over the things that sink below it, as if they stood nearer
          than the light and the eye's focus; the labels are written over it. */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']} style={[styles.footShade, { height: insets.bottom + FOOT + 70 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  footShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  things: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  smoke: { position: 'absolute', width: SMOKE.width, height: SMOKE.height },
  flame: { position: 'absolute' },
  quill: { position: 'absolute' },
  pot: { position: 'absolute', left: 0 },
  clip: { position: 'absolute', left: 0, overflow: 'hidden' },
  // Lit only where there is wax and iron: the painting itself, coloured, laid over the painting.
  warmth: { position: 'absolute', left: 0, top: 0 },
});
