/**
 * The cabinet's measurements, shared by the physics and the picture. x runs across the machine, y is up, and z runs from the
 * backboard towards the player. One unit is about the width of a small coin.
 */

/** Half the inside width. */
export const HALF_W = 5;

/** The fixed lower bed: its top is y = 0 and coins leave over its front edge. */
export const BED_FRONT = 9;
/** The glass the player looks through. The gap between it and the bed's front edge is the chute coins fall down. */
export const GLASS_Z = 10.7;
/** Below this a piece has gone down the chute. */
export const CHUTE_Y = -3;

/** The sliding shelf. It rides on the bed, and its front face shoves the bed's coins towards the player. */
export const SHELF = {
  top: 0.9,
  /** Its front edge when fully back and fully out. */
  min: 3.6,
  max: 5.4,
  /** Seconds for one push and return. */
  period: 4.4,
  length: 8,
} as const;

/** The wall the shelf slides under. Its face scrapes coins off the shelf as the shelf retreats. */
export const WIPER = { z: 1.6, top: 1.5 } as const;

/**
 * The backboard coins slide down. It starts on top of the wiper and leans away from the player, so a coin lies face-up on it,
 * rattles through the pegs, and slips off the bottom onto the shelf.
 */
export const BOARD = {
  /** Radians it leans back from upright. */
  lean: 0.3,
  length: 10.6,
  thickness: 0.4,
  /** Space between the board and the clear cover that keeps coins flat against it. */
  gap: 0.28,
  /** How far up the board the cover starts, leaving the bottom open for coins to leave. */
  coverFrom: 2.5,
} as const;

/**
 * A kicker at the foot of the board. A coin arrives nearly upright; the ramp throws its lower edge forward so it lands on its face
 * instead of standing on its rim against the wall.
 */
export const RAMP = { from: 1.3, endY: 1.5, endZ: 2.75, thickness: 0.2 } as const;

/** Unit vectors along the board's surface (uphill) and out of it (towards the player and up). */
export const BOARD_UP = { y: Math.cos(BOARD.lean), z: -Math.sin(BOARD.lean) } as const;
export const BOARD_OUT = { y: Math.sin(BOARD.lean), z: Math.cos(BOARD.lean) } as const;

/** A point on the board's surface, given how far across and how far up the board it is, lifted off the surface by `out`. */
export const onBoard = (across: number, up: number, out = 0): { x: number; y: number; z: number } => ({
  x: across,
  y: WIPER.top + BOARD_UP.y * up + BOARD_OUT.y * out,
  z: WIPER.z + BOARD_UP.z * up + BOARD_OUT.z * out,
});

export const WHEEL = {
  /** How far up the board its hub sits. */
  up: 7.7,
  radius: 1.7,
  /** Radians per second. */
  spin: 2.3,
  /** Seconds before the next coin is seated after a release. */
  reload: 0.35,
} as const;

export type CoinKind = 'small' | 'medium' | 'large';

export type CoinSpec = {
  radius: number;
  thickness: number;
  /** Coins credited when one of these goes down the chute. */
  value: number;
  /** How often the wheel serves one, relative to the others. */
  weight: number;
};

export const COINS: Record<CoinKind, CoinSpec> = {
  small: { radius: 0.5, thickness: 0.15, value: 1, weight: 66 },
  medium: { radius: 0.68, thickness: 0.18, value: 3, weight: 25 },
  large: { radius: 0.9, thickness: 0.23, value: 10, weight: 9 },
};

export const COIN_KINDS: readonly CoinKind[] = ['small', 'medium', 'large'];

export const CARD = { width: 1.5, length: 2.1, thickness: 0.05 } as const;

/** The set to collect. A card is won by getting it over the front edge. */
export const CARD_NAMES = ['Moon', 'Tide', 'Heron', 'Kelp', 'Lantern', 'Anchor', 'Shell', 'Comet', 'Leviathan'] as const;

/** How far the shelf's front edge is from the back at a moment. */
export const shelfFrontAt = (time: number): number => {
  const mid = (SHELF.min + SHELF.max) / 2;
  const amp = (SHELF.max - SHELF.min) / 2;
  return mid - amp * Math.cos((time / SHELF.period) * Math.PI * 2);
};
