/**
 * The cabinet as rigid bodies: coins are short cylinders, cards are thin slabs, and both tumble, slide and stack for real. Rapier
 * does the solving. Nothing here draws anything, so it can be run and tuned outside the app.
 */
import * as RAPIER from '@dimforge/rapier3d-compat';

import {
  BED_FRONT,
  BOARD,
  CARD,
  CARD_NAMES,
  CHUTE_Y,
  COIN_KINDS,
  type CoinKind,
  COINS,
  GLASS_Z,
  GRAVITY,
  HALF_W,
  onBoard,
  RING,
  ringYawAt,
  SHELF,
  shelfFrontAt,
  TRACK,
  TRACK_LENGTH,
  trackAt,
  trackSpeedAt,
  trackYawAt,
  WIPER,
} from './cabinet';

export const STEP = 1 / 60;
/** The most coins the cabinet holds. Past this the track waits for some to fall. */
export const MAX_COINS = 240;
const CARDS_ON_BED = 3;
/** A fresh card is dealt onto the shelf after this many coins have been dropped, if the bed is short of cards. */
const COINS_PER_CARD = 24;

type Vec = { x: number; y: number; z: number };
type Quat = { x: number; y: number; z: number; w: number };

export type Piece =
  | { type: 'coin'; kind: CoinKind; body: RAPIER.RigidBody; /** Went through the ring on its way in. */ charged: boolean }
  | { type: 'card'; card: number; body: RAPIER.RigidBody };

/** Something that went down the chute this step, and where across the cabinet it went. */
export type Fall = { piece: Piece; x: number };

/** A coin on its way down the track. It follows the rail exactly until the jump, where it becomes a free body. */
export type Rider = { kind: CoinKind; distance: number; roll: number };

/** What happened in one step. */
export type Happened = {
  falls: Fall[];
  /** Where a coin went through the ring, if one did. */
  ringed: Vec | undefined;
  /** Whether a coin just left the jump. */
  launched: boolean;
  /** Whether a coin in flight struck something. */
  clinked: boolean;
};

export type Physics = {
  world: RAPIER.World;
  shelf: RAPIER.RigidBody;
  events: RAPIER.EventQueue;
  pieces: Piece[];
  time: number;
  shelfFront: number;
  /** Which way the track points. Coins on it swing with it. */
  trackYaw: number;
  ringYaw: number;
  /** The coin waiting at the top of the track, or undefined while there is none. */
  held: CoinKind | undefined;
  /** The coins that will be set at the top after the held one, soonest first. */
  queue: CoinKind[];
  riders: Rider[];
  /** Coins that have left the jump and not yet reached the ring's arc. */
  flying: Piece[];
  reloadAt: number;
  dropped: number;
  nextCard: number;
  random: () => number;
};

const QUEUE_LENGTH = 2;

const quatAboutX = (angle: number): Quat => ({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) });
const quatAboutY = (angle: number): Quat => ({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) });
const multiply = (a: Quat, b: Quat): Quat => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});
const quatAboutZ = (angle: number): Quat => ({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) });

/** A small seeded generator, so a cabinet fills the same way every time for the same seed. */
const mulberry = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickCoin = (random: () => number): CoinKind => {
  const total = COIN_KINDS.reduce((sum, kind) => sum + COINS[kind].weight, 0);
  let roll = random() * total;
  for (const kind of COIN_KINDS) {
    roll -= COINS[kind].weight;
    if (roll < 0) return kind;
  }
  return 'small';
};

const fixedBox = (world: RAPIER.World, centre: Vec, half: Vec, friction: number, rotation = quatAboutX(0)) =>
  world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(centre.x, centre.y, centre.z).setRotation(rotation).setFriction(friction).setRestitution(0.1));

const buildCabinet = (world: RAPIER.World): RAPIER.RigidBody => {
  const tall = 9;
  fixedBox(world, { x: 0, y: -1.5, z: BED_FRONT / 2 - 2 }, { x: HALF_W, y: 1.5, z: BED_FRONT / 2 + 2 }, 0.32);
  fixedBox(world, { x: -HALF_W - 0.5, y: tall / 2 - 3, z: GLASS_Z / 2 }, { x: 0.5, y: tall, z: GLASS_Z / 2 + 2 }, 0.2);
  fixedBox(world, { x: HALF_W + 0.5, y: tall / 2 - 3, z: GLASS_Z / 2 }, { x: 0.5, y: tall, z: GLASS_Z / 2 + 2 }, 0.2);
  fixedBox(world, { x: 0, y: tall / 2 - 3, z: GLASS_Z + 0.25 }, { x: HALF_W, y: tall, z: 0.25 }, 0.1);
  // The wiper: a hair above the shelf's top, so the shelf passes under it and anything riding the shelf does not.
  fixedBox(world, { x: 0, y: (SHELF.top + 0.03 + WIPER.top) / 2, z: WIPER.z - 2 }, { x: HALF_W, y: (WIPER.top - SHELF.top - 0.03) / 2, z: 2 }, 0.2);
  const mid = BOARD.length / 2;
  fixedBox(world, onBoard(0, mid, -BOARD.thickness / 2), { x: HALF_W, y: mid, z: BOARD.thickness / 2 }, 0.2, quatAboutX(-BOARD.lean));

  const shelf = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, SHELF.top / 2, SHELF.min - SHELF.length / 2));
  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF_W, SHELF.top / 2, SHELF.length / 2).setFriction(0.5).setRestitution(0.05), shelf);
  return shelf;
};

type Placement = Vec & { rotation?: Quat; velocity?: Vec; spin?: Vec };

const addCoin = (physics: Physics, kind: CoinKind, at: Placement): Piece => {
  const spec = COINS[kind];
  const body = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(at.x, at.y, at.z)
      .setRotation(at.rotation ?? quatAboutX(0))
      .setLinvel(at.velocity?.x ?? 0, at.velocity?.y ?? 0, at.velocity?.z ?? 0)
      .setAngvel(at.spin ?? { x: 0, y: 0, z: 0 })
      .setAngularDamping(0.6)
      .setLinearDamping(0.05),
  );
  physics.world.createCollider(RAPIER.ColliderDesc.cylinder(spec.thickness / 2, spec.radius).setFriction(0.36).setRestitution(0.12).setDensity(1), body);
  const piece: Piece = { type: 'coin', kind, body, charged: false };
  physics.pieces.push(piece);
  return piece;
};

const addCard = (physics: Physics, card: number, at: Placement): Piece => {
  const body = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(at.x, at.y, at.z)
      .setRotation(at.rotation ?? quatAboutX(0))
      .setAngularDamping(1.2)
      .setLinearDamping(0.15),
  );
  // Light and slick next to a coin: a card rides on top of the heap and skates where a coin would dig in.
  physics.world.createCollider(RAPIER.ColliderDesc.cuboid(CARD.width / 2, CARD.thickness / 2, CARD.length / 2).setFriction(0.22).setRestitution(0.02).setDensity(0.35), body);
  const piece: Piece = { type: 'card', card, body };
  physics.pieces.push(piece);
  return piece;
};

/** Scatters coins over the shelf and the bed in loose layers and lets them come to rest, then lays the first cards on top. */
const prefill = (physics: Physics) => {
  const { random } = physics;
  const pitch = COINS.medium.radius * 2 + 0.1;
  const layer = (z0: number, z1: number, y: number, shift: number) => {
    for (let z = z0 + shift; z <= z1; z += pitch) {
      for (let x = -HALF_W + COINS.medium.radius + 0.05 + shift; x <= HALF_W - COINS.medium.radius; x += pitch) {
        // Large coins would overlap their neighbours on this grid, so they are laid on top afterwards.
        const kind = random() < 0.3 ? 'medium' : 'small';
        addCoin(physics, kind, { x: x + (random() - 0.5) * 0.06, y, z: z + (random() - 0.5) * 0.06 });
      }
    }
    for (let i = 0; i < 20; i++) advance(physics);
  };
  for (let n = 0; n < 2; n++) layer(WIPER.z + 0.9, SHELF.min - 0.5, SHELF.top + 0.5, (n % 2) * 0.5);
  for (let n = 0; n < 11; n++) layer(SHELF.max + 0.75, BED_FRONT - 0.8, 0.8, (n % 3) * 0.45);
  for (let n = 0; n < 5; n++) addCoin(physics, 'large', { x: -3.6 + n * 1.8, y: 2.2, z: BED_FRONT - 2.4 + (n % 2) * 1.2 });
  for (let i = 0; i < 90; i++) advance(physics);
  for (let n = 0; n < CARDS_ON_BED; n++) {
    addCard(physics, n, { x: -3 + n * 3, y: 2.4, z: BED_FRONT - 2.7 + (n % 2) * 0.8, rotation: quatAboutY((random() - 0.5) * 1.2) });
  }
  for (let i = 0; i < 120; i++) advance(physics);
};

export const createPhysics = async (seed = 11): Promise<Physics> => {
  await RAPIER.init();
  const random = mulberry(seed);
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = STEP;
  world.numSolverIterations = 8;
  const physics: Physics = {
    world,
    shelf: buildCabinet(world),
    events: new RAPIER.EventQueue(true),
    pieces: [],
    time: 0,
    shelfFront: SHELF.min,
    trackYaw: 0,
    ringYaw: 0,
    held: undefined,
    queue: [],
    riders: [],
    flying: [],
    reloadAt: Infinity,
    dropped: 0,
    nextCard: CARDS_ON_BED,
    random,
  };
  prefill(physics);
  physics.held = pickCoin(random);
  for (let n = 0; n < QUEUE_LENGTH; n++) physics.queue.push(pickCoin(random));
  physics.reloadAt = 0;
  return physics;
};

/** How many coins are loose in the cabinet. */
export const coinCount = (physics: Physics): number => physics.pieces.reduce((n, piece) => n + (piece.type === 'coin' ? 1 : 0), 0);

/** A point on the track's heading, given how far forward of the post and how high. */
const fromPost = (yaw: number, forward: number, height: number): Vec => ({ x: Math.sin(yaw) * forward, y: height, z: TRACK.pivotZ + Math.cos(yaw) * forward });

/**
 * Where a coin on the track is and how it is turned: standing on its rim across the rails, rolled round by however far it has come.
 * A coin waiting at the top is at distance 0.
 */
export const onTrack = (kind: CoinKind, distance: number, yaw: number, roll: number): { position: Vec; rotation: Quat } => {
  const point = trackAt(distance);
  const lift = COINS[kind].radius + 0.05;
  // The rail's upward normal is its direction of travel turned a quarter turn back.
  const forward = point.forward - point.dirUp * lift;
  const height = point.height + point.dirForward * lift;
  // A cylinder's own axis is y. Lay it across the track, then spin it about that axis as it rolls.
  const rotation = multiply(quatAboutY(yaw), multiply(quatAboutZ(Math.PI / 2), quatAboutY(-roll)));
  return { position: fromPost(yaw, forward, height), rotation };
};

/**
 * Lets go of the coin at the top of the track. Returns the kind released, or undefined if there was none or the cabinet is full.
 */
export const release = (physics: Physics): CoinKind | undefined => {
  const kind = physics.held;
  if (kind === undefined || coinCount(physics) + physics.riders.length >= MAX_COINS) return undefined;
  physics.riders.push({ kind, distance: 0, roll: 0 });
  physics.held = undefined;
  physics.reloadAt = physics.time + TRACK.reload;
  physics.dropped++;

  const cards = physics.pieces.filter((p) => p.type === 'card').length;
  if (physics.dropped % COINS_PER_CARD === 0 && cards < CARDS_ON_BED + 1) {
    const card = physics.nextCard++ % CARD_NAMES.length;
    addCard(physics, card, { x: (physics.random() - 0.5) * 6, y: SHELF.top + 2.6, z: WIPER.z + 1.5, rotation: quatAboutY((physics.random() - 0.5) * 1.6) });
  }
  return kind;
};

/** Turns a coin that has reached the jump into a free body, carrying on at the speed and spin it had on the rail. */
const launch = (physics: Physics, rider: Rider): Piece => {
  const end = trackAt(TRACK_LENGTH);
  const yaw = physics.trackYaw;
  const { position, rotation } = onTrack(rider.kind, TRACK_LENGTH, yaw, rider.roll);
  const speed = TRACK.launchSpeed;
  const along = speed * end.dirForward;
  const rolling = speed / COINS[rider.kind].radius;
  // A little sideways wobble, so the coin topples onto its face when it lands instead of rolling away on its rim.
  const wobble = (physics.random() < 0.5 ? -1 : 1) * (6 + physics.random() * 6);
  const piece = addCoin(physics, rider.kind, {
    ...position,
    rotation,
    velocity: { x: Math.sin(yaw) * along, y: speed * end.dirUp, z: Math.cos(yaw) * along },
    spin: { x: Math.cos(yaw) * rolling + Math.sin(yaw) * wobble, y: 0, z: -Math.sin(yaw) * rolling + Math.cos(yaw) * wobble },
  });
  piece.body.collider(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  return piece;
};

/** Moves everything on by one step of STEP seconds, and reports what happened. */
export const advance = (physics: Physics): Happened => {
  const happened: Happened = { falls: [], ringed: undefined, launched: false, clinked: false };
  physics.time += STEP;
  physics.shelfFront = shelfFrontAt(physics.time);
  physics.shelf.setNextKinematicTranslation({ x: 0, y: SHELF.top / 2, z: physics.shelfFront - SHELF.length / 2 });
  physics.ringYaw = ringYawAt(physics.time);

  physics.trackYaw = trackYawAt(physics.time);
  for (let i = physics.riders.length - 1; i >= 0; i--) {
    const rider = physics.riders[i]!;
    const speed = trackSpeedAt(rider.distance);
    rider.distance += speed * STEP;
    rider.roll += (speed * STEP) / COINS[rider.kind].radius;
    if (rider.distance < TRACK_LENGTH) continue;
    physics.flying.push(launch(physics, rider));
    physics.riders.splice(i, 1);
    happened.launched = true;
  }

  physics.world.step(physics.events);
  physics.events.drainCollisionEvents((_a, _b, started) => {
    if (started) happened.clinked = true;
  });

  for (let i = physics.flying.length - 1; i >= 0; i--) {
    const piece = physics.flying[i]!;
    const at = piece.body.translation();
    if (Math.hypot(at.x, at.z - TRACK.pivotZ) < RING.forward) continue;
    const heading = Math.atan2(at.x, at.z - TRACK.pivotZ);
    if (piece.type === 'coin' && Math.abs(heading - physics.ringYaw) < RING.tolerance && Math.abs(at.y - RING.height) < RING.radius * 0.7) {
      piece.charged = true;
      happened.ringed = { x: at.x, y: at.y, z: at.z };
    }
    physics.flying.splice(i, 1);
  }

  for (let i = physics.pieces.length - 1; i >= 0; i--) {
    const piece = physics.pieces[i]!;
    const at = piece.body.translation();
    if (at.y > CHUTE_Y) continue;
    happened.falls.push({ piece, x: at.x });
    const inFlight = physics.flying.indexOf(piece);
    if (inFlight >= 0) physics.flying.splice(inFlight, 1);
    physics.world.removeRigidBody(piece.body);
    physics.pieces.splice(i, 1);
  }

  if (physics.held === undefined && physics.time >= physics.reloadAt) {
    physics.held = physics.queue.shift();
    physics.queue.push(pickCoin(physics.random));
  }
  return happened;
};
