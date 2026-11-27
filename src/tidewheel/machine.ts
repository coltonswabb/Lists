/**
 * The cabinet, in the units the physics runs in. x runs left to right across the machine, y is height above the lower bed, and z
 * runs from the back wall towards the player standing in front of the glass.
 */

/** Half the inside width of the cabinet. */
export const HALF_W = 150;

/** Height of the sliding shelf's top above the lower bed. */
export const SHELF_Y = 40;
/** The face of the fixed back wall the shelf slides under. It wipes orbs off the shelf as the shelf retreats. */
export const BACK_Z = 70;

export const PUSHER = {
  /** How far forward the shelf's front edge sits when fully back and fully out. */
  min: 118,
  max: 176,
  /** Seconds for one push and return. */
  period: 3.4,
} as const;

/** The front edge of the lower bed. Orbs that go over it leave the cabinet. */
export const BED_FRONT = 268;
/** Only the middle of the front edge pays out. An orb that goes over nearer a wall than this is lost. */
export const WIN_HALF_W = 100;
/** A low rounded rim along the front edge, so a single orb does not just roll off: the heap has to shove it over. */
export const RIM = { z: 264, radius: 2 } as const;
export const GLASS_Z = 292;

export const WHEEL = {
  y: 205,
  z: 122,
  radius: 64,
  /** Radians per second. */
  spin: 2.5,
  /** A released orb leaves faster than the rim moves, so a throw can reach the walls. */
  fling: 1.15,
  /** Seconds before the next orb is seated after a release. */
  reload: 0.3,
} as const;

/** How far the shelf's front edge is from the back at a moment, and how fast it is moving towards the player. */
export const pusherAt = (time: number): { front: number; speed: number } => {
  const angle = (time / PUSHER.period) * Math.PI * 2;
  const mid = (PUSHER.min + PUSHER.max) / 2;
  const amp = (PUSHER.max - PUSHER.min) / 2;
  return { front: mid - amp * Math.cos(angle), speed: ((amp * Math.PI * 2) / PUSHER.period) * Math.sin(angle) };
};

/** The picture the cabinet is drawn into, before it is scaled to the screen. */
export const VIEW_W = 360;
export const VIEW_H = 640;

const EYE = { x: 0, y: 520, z: 640 };
const LOOK_AT = { x: 0, y: 60, z: 150 };
const FOCAL = 735;
const CENTRE_X = VIEW_W / 2;
const CENTRE_Y = 340;

const forward = (() => {
  const y = LOOK_AT.y - EYE.y;
  const z = LOOK_AT.z - EYE.z;
  const length = Math.hypot(y, z);
  return { y: y / length, z: z / length };
})();
/** The camera's up, at right angles to where it looks. The camera never rolls or turns sideways, so x stays x. */
const up = { y: -forward.z, z: forward.y };

export type Projected = { x: number; y: number; scale: number; depth: number };

/** Where a point in the cabinet lands in the picture, how big a unit length looks there, and how far it is from the eye. */
export const project = (x: number, y: number, z: number): Projected => {
  const dy = y - EYE.y;
  const dz = z - EYE.z;
  const depth = dy * forward.y + dz * forward.z;
  const scale = FOCAL / depth;
  return { x: CENTRE_X + (x - EYE.x) * scale, y: CENTRE_Y - (dy * up.y + dz * up.z) * scale, scale, depth };
};

/** How much a flat disc lying on the bed is squashed by the camera's downward tilt. */
export const GROUND_SQUASH = -forward.y;
