import { StatusBar } from 'expo-status-bar';
import { type FC, memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Polygon, Polyline, Stop } from 'react-native-svg';

import { tick } from '../haptics';
import {
  BACK_Z,
  BED_FRONT,
  GLASS_Z,
  GROUND_SQUASH,
  HALF_W,
  project,
  PUSHER,
  RIM,
  SHELF_Y,
  VIEW_H,
  VIEW_W,
  WHEEL,
  WIN_HALF_W,
} from './machine';
import { aim, createSim, MAX_ORBS, MAX_RADIUS, release, type Sim, step, STEP_HZ } from './sim';

const PEARL = require('../../assets/tidewheel/pearl.png');
const SHADOW = require('../../assets/tidewheel/shadow.png');

const INK = '#070a1a';
const BONE = '#efe7d6';
const BRASS = '#b08d57';
const CORAL = '#ff6b5a';

/** Sprites are laid out at this size and scaled per frame, so one view can show an orb at any distance. */
const SPRITE = 64;

/** Numbers per sprite in the frame: centre x, centre y, scale, opacity. */
const STRIDE = 4;
const SHADOWS_AT = MAX_ORBS * STRIDE;
const SHELF_AT = SHADOWS_AT * 2;
/** The shelf's six moving corners: top front left and right, bottom front left and right, as x then y each. */
const SHELF_NUMBERS = 8;
const AIM_AT = SHELF_AT + SHELF_NUMBERS;
const FRAME_LENGTH = AIM_AT + STRIDE;

/** If the app stalls, catch up by at most this many ticks, then let time slip. */
const MAX_CATCH_UP = 8;
/** How dark the shadow under an orb resting on a surface is, and the height at which it has faded away. */
const SHADOW_DARKNESS = 0.5;
const SHADOW_FADE_HEIGHT = 170;

type Frame = SharedValue<number[]>;

const order = new Int32Array(MAX_ORBS);
const depths = new Float64Array(MAX_ORBS);

/** The height of whatever lies under a point: the shelf, the bed, or nothing where an orb would fall away. */
const surfaceUnder = (sim: Sim, z: number): number | undefined => {
  if (z <= sim.shelfFront) return SHELF_Y;
  return z > BED_FRONT ? undefined : 0;
};

/**
 * Turns the cabinet into a flat picture. Orbs are written far to near, so the views that show them can stay in a fixed order and
 * still overlap correctly: the first view always shows the farthest orb.
 */
const snapshot = (sim: Sim): number[] => {
  const frame = new Array<number>(FRAME_LENGTH).fill(0);
  let count = 0;
  for (let i = 0; i < MAX_ORBS; i++) {
    if (!sim.active[i]) continue;
    depths[i] = project(sim.px[i]!, sim.py[i]!, sim.pz[i]!).depth;
    order[count++] = i;
  }
  const shown = order.subarray(0, count).sort((a, b) => depths[b]! - depths[a]!);
  for (let n = 0; n < count; n++) {
    const i = shown[n]!;
    const r = sim.radius[i]!;
    const at = project(sim.px[i]!, sim.py[i]!, sim.pz[i]!);
    frame[n * STRIDE] = at.x;
    frame[n * STRIDE + 1] = at.y;
    frame[n * STRIDE + 2] = (at.scale * r * 2) / SPRITE;
    // Orbs that have gone over an edge sink out of sight behind the front of the cabinet.
    frame[n * STRIDE + 3] = Math.max(0, Math.min(1, (sim.py[i]! + 55) / 30));

    const surface = surfaceUnder(sim, sim.pz[i]!);
    if (surface === undefined || sim.py[i]! < surface) continue;
    const ground = project(sim.px[i]!, surface, sim.pz[i]!);
    const height = sim.py[i]! - r - surface;
    const s = SHADOWS_AT + n * STRIDE;
    frame[s] = ground.x + 3 * ground.scale;
    frame[s + 1] = ground.y;
    frame[s + 2] = (ground.scale * r * 2.5 * (1 + height / 260)) / SPRITE;
    frame[s + 3] = SHADOW_DARKNESS * Math.max(0, 1 - height / SHADOW_FADE_HEIGHT);
  }

  const corners = [
    project(-HALF_W, SHELF_Y, sim.shelfFront),
    project(HALF_W, SHELF_Y, sim.shelfFront),
    project(-HALF_W, 0, sim.shelfFront),
    project(HALF_W, 0, sim.shelfFront),
  ];
  corners.forEach((corner, c) => {
    frame[SHELF_AT + c * 2] = corner.x;
    frame[SHELF_AT + c * 2 + 1] = corner.y;
  });

  if (sim.held >= 0) {
    const target = aim(sim);
    const at = project(target.x, target.y + 0.5, target.z);
    frame[AIM_AT] = at.x;
    frame[AIM_AT + 1] = at.y;
    frame[AIM_AT + 2] = (at.scale * MAX_RADIUS * 2.6) / SPRITE;
    frame[AIM_AT + 3] = 1;
  }
  return frame;
};

type SpriteProps = { at: number; frame: Frame; flat?: boolean; ring?: boolean };

const Sprite: FC<SpriteProps> = memo(({ at, frame, flat = false, ring = false }) => {
  const style = useAnimatedStyle(() => {
    const f = frame.value;
    const scale = f[at + 2] ?? 0;
    return {
      opacity: f[at + 3] ?? 0,
      transform: [{ translateX: (f[at] ?? 0) - SPRITE / 2 }, { translateY: (f[at + 1] ?? 0) - SPRITE / 2 }, { scaleX: scale }, { scaleY: flat ? scale * GROUND_SQUASH : scale }],
    };
  });
  if (ring) return <Animated.View pointerEvents="none" style={[styles.sprite, styles.aim, style]} />;
  return <Animated.Image source={flat ? SHADOW : PEARL} style={[styles.sprite, style]} />;
});
Sprite.displayName = 'Sprite';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BACK = [project(-HALF_W, SHELF_Y, BACK_Z), project(HALF_W, SHELF_Y, BACK_Z)] as const;

type ShelfProps = { frame: Frame };

/** The sliding shelf: its top, which stretches as it comes forward, and the front face that does the pushing. */
const Shelf: FC<ShelfProps> = ({ frame }) => {
  const top = useAnimatedProps(() => {
    const f = frame.value;
    return { d: `M ${BACK[0].x} ${BACK[0].y} L ${BACK[1].x} ${BACK[1].y} L ${f[SHELF_AT + 2]} ${f[SHELF_AT + 3]} L ${f[SHELF_AT]} ${f[SHELF_AT + 1]} Z` };
  });
  const face = useAnimatedProps(() => {
    const f = frame.value;
    return { d: `M ${f[SHELF_AT]} ${f[SHELF_AT + 1]} L ${f[SHELF_AT + 2]} ${f[SHELF_AT + 3]} L ${f[SHELF_AT + 6]} ${f[SHELF_AT + 7]} L ${f[SHELF_AT + 4]} ${f[SHELF_AT + 5]} Z` };
  });
  return (
    <Svg width={VIEW_W} height={VIEW_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="shelfTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1c2658" />
          <Stop offset="1" stopColor="#2c3a7c" />
        </LinearGradient>
        <LinearGradient id="shelfFace" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#d2b077" />
          <Stop offset="1" stopColor="#7d6238" />
        </LinearGradient>
      </Defs>
      <AnimatedPath animatedProps={top} fill="url(#shelfTop)" />
      <AnimatedPath animatedProps={face} fill="url(#shelfFace)" />
    </Svg>
  );
};

const corner = (x: number, y: number, z: number): string => {
  const p = project(x, y, z);
  return `${p.x},${p.y}`;
};

const quad = (...corners: [number, number, number][]): string => corners.map(([x, y, z]) => corner(x, y, z)).join(' ');

const CEILING = 520;
const PIT = -70;
const RIM_WIDTH = Math.max(3, RIM.radius * 2 * project(0, 0, RIM.z).scale);

/** The wheel's rim as seen from the front: a circle lying flat, so an ellipse. */
const wheelRim = (from: number, to: number): string =>
  Array.from({ length: 49 }, (_, n) => {
    const angle = from + ((to - from) * n) / 48;
    return corner(Math.cos(angle) * WHEEL.radius, WHEEL.y, WHEEL.z + Math.sin(angle) * WHEEL.radius);
  }).join(' ');

/** Everything in the cabinet that never moves and sits behind the orbs. */
const Interior: FC = memo(() => (
  <Svg width={VIEW_W} height={VIEW_H} style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <LinearGradient id="backWall" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#0d1232" />
        <Stop offset="1" stopColor="#1a2356" />
      </LinearGradient>
      <LinearGradient id="sideWall" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#0a0e28" />
        <Stop offset="1" stopColor="#131a42" />
      </LinearGradient>
      <LinearGradient id="payout" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#7a3340" />
        <Stop offset="1" stopColor="#1a0f1e" />
      </LinearGradient>
      <LinearGradient id="bed" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#1a2354" />
        <Stop offset="1" stopColor="#33438c" />
      </LinearGradient>
    </Defs>
    <Polygon points={quad([-HALF_W, CEILING, BACK_Z], [HALF_W, CEILING, BACK_Z], [HALF_W, SHELF_Y, BACK_Z], [-HALF_W, SHELF_Y, BACK_Z])} fill="url(#backWall)" />
    <Polygon points={quad([-HALF_W, CEILING, BACK_Z], [-HALF_W, CEILING, GLASS_Z], [-HALF_W, PIT, GLASS_Z], [-HALF_W, PIT, BACK_Z])} fill="url(#sideWall)" />
    <Polygon points={quad([HALF_W, CEILING, BACK_Z], [HALF_W, CEILING, GLASS_Z], [HALF_W, PIT, GLASS_Z], [HALF_W, PIT, BACK_Z])} fill="url(#sideWall)" />
    {/* The pit the gutters and the front edge drop into. */}
    <Polygon points={quad([-HALF_W, PIT, PUSHER.min], [HALF_W, PIT, PUSHER.min], [HALF_W, PIT, GLASS_Z], [-HALF_W, PIT, GLASS_Z])} fill="#04060f" />
    <Polygon points={quad([-HALF_W, 0, PUSHER.min], [HALF_W, 0, PUSHER.min], [HALF_W, 0, BED_FRONT], [-HALF_W, 0, BED_FRONT])} fill="url(#bed)" />
    {/* The front of the bed: lit where going over pays, dark at the two ends where it does not. */}
    <Polygon points={quad([-HALF_W, 0, BED_FRONT], [HALF_W, 0, BED_FRONT], [HALF_W, PIT, BED_FRONT], [-HALF_W, PIT, BED_FRONT])} fill="#0a0e26" />
    <Polygon points={quad([-WIN_HALF_W, 0, BED_FRONT], [WIN_HALF_W, 0, BED_FRONT], [WIN_HALF_W, PIT, BED_FRONT], [-WIN_HALF_W, PIT, BED_FRONT])} fill="url(#payout)" />
    <Polyline points={quad([-HALF_W, RIM.radius, RIM.z], [HALF_W, RIM.radius, RIM.z])} stroke="#4a5591" strokeWidth={RIM_WIDTH} />
    <Polyline points={quad([-WIN_HALF_W, RIM.radius, RIM.z], [WIN_HALF_W, RIM.radius, RIM.z])} stroke={CORAL} strokeWidth={RIM_WIDTH} strokeLinecap="round" />
    <Polyline points={quad([-WIN_HALF_W, 0.5, BED_FRONT - 46], [-WIN_HALF_W, 0.5, BED_FRONT])} stroke={CORAL} strokeWidth={1.5} opacity={0.5} />
    <Polyline points={quad([WIN_HALF_W, 0.5, BED_FRONT - 46], [WIN_HALF_W, 0.5, BED_FRONT])} stroke={CORAL} strokeWidth={1.5} opacity={0.5} />
    {/* The wheel hangs from the ceiling on a rod. */}
    <Polyline points={quad([0, CEILING, WHEEL.z], [0, WHEEL.y, WHEEL.z])} stroke={BRASS} strokeWidth={3} opacity={0.6} />
    <Polyline points={wheelRim(0, Math.PI * 2)} stroke={BRASS} strokeWidth={2.5} fill="none" />
    <Polyline points={quad([-WHEEL.radius, WHEEL.y, WHEEL.z], [WHEEL.radius, WHEEL.y, WHEEL.z])} stroke={BRASS} strokeWidth={1.5} opacity={0.5} />
    <Polyline points={quad([0, WHEEL.y, WHEEL.z - WHEEL.radius], [0, WHEEL.y, WHEEL.z + WHEEL.radius])} stroke={BRASS} strokeWidth={1.5} opacity={0.5} />
  </Svg>
));
Interior.displayName = 'Interior';

/** The glass runs from under the marquee down to just below the bed's front edge. */
const FRAME_TOP = 76;
const SILL = project(0, -34, GLASS_Z).y;
const GLASS_LEFT = project(-HALF_W, 0, GLASS_Z).x;
const GLASS_RIGHT = project(HALF_W, 0, GLASS_Z).x;

type FrontProps = { won: number; lost: number };

/** The outside of the cabinet, in front of the glass: the marquee above, the sill below with its counters, and a sheen on the glass. */
const Front: FC<FrontProps> = ({ won, lost }) => (
  <>
    <Svg width={VIEW_W} height={VIEW_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#151b40" />
          <Stop offset="1" stopColor="#0a0d22" />
        </LinearGradient>
      </Defs>
      <Path d={`M ${GLASS_LEFT} ${FRAME_TOP} H ${GLASS_RIGHT} V ${SILL} H ${GLASS_LEFT} Z`} fill="url(#sheen)" />
      <Path
        fillRule="evenodd"
        d={`M 0 0 H ${VIEW_W} V ${VIEW_H} H 0 Z M ${GLASS_LEFT} ${FRAME_TOP} V ${SILL} H ${GLASS_RIGHT} V ${FRAME_TOP} Z`}
        fill="url(#body)"
      />
      <Path d={`M ${GLASS_LEFT} ${FRAME_TOP} H ${GLASS_RIGHT} V ${SILL} H ${GLASS_LEFT} Z`} stroke={BRASS} strokeWidth={2} fill="none" />
    </Svg>
    <Text style={[styles.marquee, { top: FRAME_TOP / 2 - 14 }]}>TIDEWHEEL</Text>
    <View style={[styles.sill, { top: SILL + 14 }]}>
      <View style={styles.counter}>
        <Text style={styles.count}>{won}</Text>
        <Text style={styles.label}>WON</Text>
      </View>
      <View style={styles.counter}>
        <Text style={[styles.count, styles.dim]}>{lost}</Text>
        <Text style={styles.label}>LOST</Text>
      </View>
    </View>
  </>
);

const claimTouch = () => true;

const ORB_SPRITES = Array.from({ length: MAX_ORBS }, (_, n) => n * STRIDE);

const Game: FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const room = height - insets.top - insets.bottom;
  const scale = Math.min(width / VIEW_W, room / VIEW_H);

  const sim = useMemo(() => createSim(), []);
  const frame = useSharedValue<number[]>(snapshot(sim));
  const [score, setScore] = useState({ won: 0, lost: 0 });
  const shown = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last: number | undefined;
    let owed = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      owed += last === undefined ? 0 : ((now - last) / 1000) * STEP_HZ;
      last = now;
      const ticks = Math.min(MAX_CATCH_UP, Math.floor(owed));
      owed = ticks === MAX_CATCH_UP ? 0 : owed - ticks;
      if (ticks === 0) return;
      for (let i = 0; i < ticks; i++) step(sim);
      frame.value = snapshot(sim);
      if (sim.won + sim.lost !== shown.current) {
        shown.current = sim.won + sim.lost;
        setScore({ won: sim.won, lost: sim.lost });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim, frame]);

  const drop = () => {
    if (release(sim)) tick();
  };

  return (
    // The responder fires on touch-down itself. A Pressable waits to tell a press from a scroll, which a timing game cannot afford.
    <View
      onStartShouldSetResponder={claimTouch}
      onResponderGrant={drop}
      style={[styles.screen, { paddingTop: insets.top }]}
      accessibilityRole="button"
      accessibilityLabel="Drop orb"
    >
      <StatusBar style="light" />
      <View style={{ width: VIEW_W * scale, height: VIEW_H * scale, overflow: 'hidden' }}>
        <View pointerEvents="none" style={[styles.picture, { transform: [{ scale }] }]}>
          <Interior />
          <Shelf frame={frame} />
          {ORB_SPRITES.map((at) => (
            <Sprite key={`shadow${at}`} at={SHADOWS_AT + at} frame={frame} flat />
          ))}
          <Sprite at={AIM_AT} frame={frame} flat ring />
          {ORB_SPRITES.map((at) => (
            <Sprite key={`orb${at}`} at={at} frame={frame} />
          ))}
          <Front won={score.won} lost={score.lost} />
        </View>
      </View>
    </View>
  );
};

/** The Tidewheel prototype: a pusher cabinet seen from where the player stands. Tap anywhere to let go of the orb on the wheel. */
export const TidewheelScreen: FC = () => (
  <SafeAreaProvider>
    <Game />
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: INK, alignItems: 'center' },
  picture: { position: 'absolute', left: 0, top: 0, width: VIEW_W, height: VIEW_H, transformOrigin: 'top left', backgroundColor: INK },
  sprite: { position: 'absolute', left: 0, top: 0, width: SPRITE, height: SPRITE },
  aim: { borderRadius: SPRITE / 2, borderWidth: 4, borderColor: CORAL },
  marquee: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: BONE, fontSize: 24, letterSpacing: 8, fontWeight: '300' },
  sill: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 56 },
  counter: { alignItems: 'center' },
  count: { color: BONE, fontSize: 34, fontVariant: ['tabular-nums'], fontWeight: '300' },
  dim: { opacity: 0.45 },
  label: { color: BRASS, fontSize: 11, letterSpacing: 3 },
});
