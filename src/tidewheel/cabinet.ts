/**
 * The cabinet's measurements, shared by the physics and the picture. x runs across the machine, y is up, and z runs from the
 * backboard towards the player. One unit is about the width of a small coin.
 */

export const GRAVITY = 34;

/** Half the inside width. */
export const HALF_W = 5;

/** The fixed lower bed: its top is y = 0 and coins leave over its front edge. */
export const BED_FRONT = 11.6;
/** The glass the player looks through. The gap between it and the bed's front edge is the chute coins fall down. */
export const GLASS_Z = 13.3;
/** Below this a piece has gone down the chute. */
export const CHUTE_Y = -3;

/** The sliding shelf. It rides on the bed, and its front face shoves the bed's coins towards the player. */
export const SHELF = {
  top: 0.9,
  /** Its front edge when fully back and fully out. */
  min: 5.6,
  max: 6.8,
  /** How much further out it reaches while the tide is in. */
  surge: 1.5,
  /** Seconds for one push and return. */
  period: 5,
  length: 12,
} as const;

/**
 * The wall the shelf slides under. Its face scrapes coins off the shelf as the shelf retreats, so it stands upright and taller than
 * any heap: a wall that leaned back would let the top of a heap ride back with the shelf and never be pushed off.
 */
export const WIPER = { z: 1.6, top: 3.8 } as const;

/** The backboard, which starts on top of the wiper and leans away from the player, leaving room for the track to come down. */
export const BOARD = {
  /** Radians it leans back from upright. */
  lean: 0.3,
  length: 10.6,
  thickness: 0.4,
  /** How far behind the wiper's face it stands, which is the room the track comes down in. */
  setback: 1.5,
} as const;

/** Unit vectors along the board's surface (uphill) and out of it (towards the player and up). */
export const BOARD_UP = { y: Math.cos(BOARD.lean), z: -Math.sin(BOARD.lean) } as const;
export const BOARD_OUT = { y: Math.sin(BOARD.lean), z: Math.cos(BOARD.lean) } as const;

/** A point on the board's surface, given how far across and how far up the board it is, lifted off the surface by `out`. */
export const onBoard = (across: number, up: number, out = 0): { x: number; y: number; z: number } => ({
  x: across,
  y: WIPER.top + BOARD_UP.y * up + BOARD_OUT.y * out,
  z: WIPER.z - BOARD.setback + BOARD_UP.z * up + BOARD_OUT.z * out,
});

/**
 * The drop track: a coaster rail that comes out of the backboard, falls, dips, and kicks up into a jump. The whole track swings
 * slowly from side to side about a post behind it, and that is the aim: a coin goes where the track points as it leaves the jump.
 */
export const TRACK = {
  /** Where the post stands, behind the board. Distances along the track are measured forward from here. */
  pivotZ: -1.25,
  /** The rail's shape as forward distance from the post, then height. */
  shape: [
    [0.5, 10.3],
    [0.68, 9.1],
    [1.2, 7.1],
    [1.9, 5.4],
    [2.5, 4.55],
    [3.05, 4.65],
  ],
  /** Radians it swings either side of straight ahead, and seconds for a full swing there and back. */
  swing: 0.52,
  period: 5.2,
  /** How fast a coin leaves the jump. A coin rolls far slower than a frictionless fall would have it, so this sets the pace. */
  launchSpeed: 4.6,
  /** Half the gap between the two rails. */
  gauge: 0.12,
  /** Seconds before the next coin is set at the top after one is let go. */
  reload: 0.3,
} as const;

/** How many straight pieces the rail is cut into for measuring along it. */
const TRACK_PIECES = 96;

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

const trackSamples = (() => {
  const shape = TRACK.shape;
  const at = (n: number) => shape[Math.max(0, Math.min(shape.length - 1, n))]!;
  const forward: number[] = [];
  const height: number[] = [];
  const along: number[] = [];
  for (let i = 0; i <= TRACK_PIECES; i++) {
    const u = (i / TRACK_PIECES) * (shape.length - 1);
    const n = Math.min(shape.length - 2, Math.floor(u));
    const t = u - n;
    forward.push(catmullRom(at(n - 1)[0]!, at(n)[0]!, at(n + 1)[0]!, at(n + 2)[0]!, t));
    height.push(catmullRom(at(n - 1)[1]!, at(n)[1]!, at(n + 1)[1]!, at(n + 2)[1]!, t));
    along.push(i === 0 ? 0 : along[i - 1]! + Math.hypot(forward[i]! - forward[i - 1]!, height[i]! - height[i - 1]!));
  }
  return { forward, height, along };
})();

export const TRACK_LENGTH = trackSamples.along[TRACK_PIECES]!;

export type TrackPoint = {
  forward: number;
  height: number;
  /** The direction of travel, as forward and upward parts of a unit vector. */
  dirForward: number;
  dirUp: number;
};

/** The rail at a distance along it from the top. */
export const trackAt = (distance: number): TrackPoint => {
  const { forward, height, along } = trackSamples;
  const d = Math.max(0, Math.min(TRACK_LENGTH, distance));
  let i = 1;
  while (i < TRACK_PIECES && along[i]! < d) i++;
  const span = along[i]! - along[i - 1]!;
  const t = span > 0 ? (d - along[i - 1]!) / span : 0;
  const df = forward[i]! - forward[i - 1]!;
  const dh = height[i]! - height[i - 1]!;
  return { forward: forward[i - 1]! + df * t, height: height[i - 1]! + dh * t, dirForward: df / span, dirUp: dh / span };
};

const TRACK_TOP = TRACK.shape[0]![1]!;
const TRACK_END = TRACK.shape[TRACK.shape.length - 1]![1]!;
const START_SPEED = 1.2;
/** A coin picks up speed as it drops, scaled so that it leaves the jump at the launch speed. */
const ROLL = TRACK.launchSpeed / Math.sqrt(START_SPEED * START_SPEED + 2 * GRAVITY * (TRACK_TOP - TRACK_END));

/**
 * How fast a coin is rolling at a distance along the track. It gathers speed as it drops, and runs quicker than that through the
 * middle of the ride, which keeps the ride short without changing how fast it leaves the jump.
 */
export const trackSpeedAt = (distance: number): number => {
  const fall = Math.sqrt(START_SPEED * START_SPEED + 2 * GRAVITY * Math.max(0, TRACK_TOP - trackAt(distance).height));
  return ROLL * fall * (1 + 1.3 * Math.sin((Math.PI * Math.max(0, Math.min(TRACK_LENGTH, distance))) / TRACK_LENGTH));
};

/** Seconds a coin takes from the top of the track to the jump. */
export const RIDE_TIME = (() => {
  let time = 0;
  for (let d = 0; d < TRACK_LENGTH; d += 0.01) time += 0.01 / trackSpeedAt(d);
  return time;
})();

/** Which way the track points at a moment: 0 is straight at the player, positive to the player's right. */
export const trackYawAt = (time: number): number => TRACK.swing * Math.sin((time / TRACK.period) * Math.PI * 2);

/**
 * The ring a well-timed coin flies through. It rides an arc about the same post as the track, at the height a coin has reached that
 * far out, so whether a coin threads it depends only on where the track was pointing when the coin was let go.
 */
export const RING = (() => {
  const end = trackAt(TRACK_LENGTH);
  const forward = end.forward + 1.25;
  const time = (forward - end.forward) / (TRACK.launchSpeed * end.dirForward);
  return {
    forward,
    height: end.height + TRACK.launchSpeed * end.dirUp * time - 0.5 * GRAVITY * time * time,
    radius: 1.2,
    /** Radians it travels either side of straight ahead, and seconds there and back. */
    swing: 0.44,
    period: 3.3,
    /** How far off centre, in radians about the post, a coin can be and still go through. */
    tolerance: 0.13,
  } as const;
})();

export const ringYawAt = (time: number): number => RING.swing * Math.sin((time / RING.period) * Math.PI * 2 + 1.1);

/** Where a coin let go on this heading first comes down to a given height, as forward distance from the post. */
export const landingForward = (height: number): number => {
  const end = trackAt(TRACK_LENGTH);
  const up = TRACK.launchSpeed * end.dirUp;
  const time = (up + Math.sqrt(up * up + 2 * GRAVITY * Math.max(0, end.height - height))) / GRAVITY;
  return end.forward + TRACK.launchSpeed * end.dirForward * time;
};

export type CoinKind = 'small' | 'medium' | 'large';

export type CoinSpec = {
  radius: number;
  thickness: number;
  /** Coins credited when one of these goes down the chute. */
  value: number;
  /** How often the track serves one, relative to the others. */
  weight: number;
};

export const COINS: Record<CoinKind, CoinSpec> = {
  small: { radius: 0.5, thickness: 0.15, value: 1, weight: 66 },
  medium: { radius: 0.68, thickness: 0.18, value: 3, weight: 25 },
  large: { radius: 0.9, thickness: 0.23, value: 10, weight: 9 },
};

export const COIN_KINDS: readonly CoinKind[] = ['small', 'medium', 'large'];

/** A coin that went through the ring is worth this many times its usual value when it falls. */
export const RING_BONUS = 3;

export const CARD = { width: 1.5, length: 2.1, thickness: 0.05 } as const;

/** The set to collect. A card is won by getting it over the front edge. */
export const CARD_NAMES = ['Moon', 'Tide', 'Heron', 'Kelp', 'Lantern', 'Anchor', 'Shell', 'Comet', 'Leviathan'] as const;

/** How far the shelf's front edge is from the back at a moment, given how far out it reaches on this push. */
export const shelfFrontAt = (time: number, reach: number): number => SHELF.min + ((reach - SHELF.min) * (1 - Math.cos((time / SHELF.period) * Math.PI * 2))) / 2;

/**
 * What can make a coin more than a coin.
 * - heavy: several times the weight, so it ploughs into the heap where an ordinary coin would ride on top.
 * - burst: goes off shortly after it lands and throws its neighbours outward.
 * - chip: a token dealt into the heap now and then. Get it over the edge and the machine rains coins.
 */
export type Power = 'heavy' | 'burst' | 'chip';

export const POWERS = {
  heavyDensity: 7,
  /** Seconds from leaving the jump to going off. */
  burstFuse: 1.1,
  burstReach: 3.2,
  burstForce: 13,
  /** Coins the machine rains when a chip is won, and seconds between them. */
  rain: 14,
  rainGap: 0.13,
} as const;

/** What the track serves: a size of coin, and perhaps a power. */
export type Serving = { kind: CoinKind; power: Power | undefined };
