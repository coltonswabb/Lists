/**
 * The cabinet as rigid bodies: coins are short cylinders, cards are thin slabs, and both tumble, slide and stack for real. Rapier
 * does the solving. Nothing here draws anything, so it can be run and tuned outside the app.
 */
import * as RAPIER from '@dimforge/rapier3d-compat';

import {
  BED_FRONT,
  BOARD,
  BOARD_OUT,
  BOARD_UP,
  CARD,
  CARD_NAMES,
  CHUTE_Y,
  COIN_KINDS,
  type CoinKind,
  COINS,
  GLASS_Z,
  HALF_W,
  onBoard,
  RAMP,
  SHELF,
  shelfFrontAt,
  WHEEL,
  WIPER,
} from './cabinet';

export const STEP = 1 / 60;
const GRAVITY = 34;
/** The most coins the cabinet holds. Past this the wheel waits for some to fall. */
export const MAX_COINS = 240;
const CARDS_ON_BED = 3;
/** A fresh card is dealt onto the shelf after this many coins have been dropped, if the bed is short of cards. */
const COINS_PER_CARD = 24;

export type Piece =
  | { type: 'coin'; kind: CoinKind; body: RAPIER.RigidBody }
  | { type: 'card'; card: number; body: RAPIER.RigidBody };

/** Something that went down the chute this step, and where across the cabinet it went. */
export type Fall = { piece: Piece; x: number };

export type Physics = {
  world: RAPIER.World;
  pieces: Piece[];
  time: number;
  shelfFront: number;
  wheelAngle: number;
  /** The coin waiting on the wheel, or undefined while the wheel is empty. */
  held: CoinKind | undefined;
  /** The coin that will be seated after the held one. */
  next: CoinKind;
  /** How many times a freshly dropped coin has struck something since the last step, for sound. */
  clinks: number;
};

const quatAboutX = (angle: number) => ({ x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) });
/** Turns a body's own up to point out of the board, so a coin lies face-up on it. */
const FLAT_ON_BOARD = quatAboutX(Math.PI / 2 - BOARD.lean);
/** Turns a body's own up to run along the board, for the board itself and its cover. */
const ALONG_BOARD = quatAboutX(-BOARD.lean);

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

let random = mulberry(11);

const pickCoin = (): CoinKind => {
  const total = COIN_KINDS.reduce((sum, kind) => sum + COINS[kind].weight, 0);
  let roll = random() * total;
  for (const kind of COIN_KINDS) {
    roll -= COINS[kind].weight;
    if (roll < 0) return kind;
  }
  return 'small';
};

const fixedBox = (world: RAPIER.World, centre: { x: number; y: number; z: number }, half: { x: number; y: number; z: number }, friction: number, rotation = quatAboutX(0)) =>
  world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(centre.x, centre.y, centre.z).setRotation(rotation).setFriction(friction).setRestitution(0.1));

const buildCabinet = (world: RAPIER.World): RAPIER.RigidBody => {
  const tall = 9;
  fixedBox(world, { x: 0, y: -1.5, z: BED_FRONT / 2 - 2 }, { x: HALF_W, y: 1.5, z: BED_FRONT / 2 + 2 }, 0.32);
  fixedBox(world, { x: -HALF_W - 0.5, y: tall / 2 - 3, z: 3 }, { x: 0.5, y: tall, z: 8 }, 0.2);
  fixedBox(world, { x: HALF_W + 0.5, y: tall / 2 - 3, z: 3 }, { x: 0.5, y: tall, z: 8 }, 0.2);
  fixedBox(world, { x: 0, y: tall / 2 - 3, z: GLASS_Z + 0.25 }, { x: HALF_W, y: tall, z: 0.25 }, 0.1);
  // The wiper: a hair above the shelf's top, so the shelf passes under it and anything riding the shelf does not.
  fixedBox(world, { x: 0, y: (SHELF.top + 0.03 + WIPER.top) / 2, z: WIPER.z - 2 }, { x: HALF_W, y: (WIPER.top - SHELF.top - 0.03) / 2, z: 2 }, 0.2);

  const mid = BOARD.length / 2;
  const board = onBoard(0, mid, -BOARD.thickness / 2);
  fixedBox(world, board, { x: HALF_W, y: mid, z: BOARD.thickness / 2 }, 0.08, ALONG_BOARD);
  const coverMid = (BOARD.coverFrom + BOARD.length) / 2;
  const cover = onBoard(0, coverMid, BOARD.gap + 0.1);
  fixedBox(world, cover, { x: HALF_W, y: (BOARD.length - BOARD.coverFrom) / 2, z: 0.1 }, 0.05, ALONG_BOARD);
  const cap = onBoard(0, BOARD.length + 0.2, BOARD.gap / 2);
  fixedBox(world, cap, { x: HALF_W, y: 0.2, z: BOARD.gap }, 0.1, ALONG_BOARD);
  const rampTop = onBoard(0, RAMP.from);
  const run = Math.hypot(RAMP.endY - rampTop.y, RAMP.endZ - rampTop.z);
  const pitch = Math.atan2(rampTop.y - RAMP.endY, RAMP.endZ - rampTop.z);
  fixedBox(
    world,
    { x: 0, y: (rampTop.y + RAMP.endY) / 2 - (Math.cos(pitch) * RAMP.thickness) / 2, z: (rampTop.z + RAMP.endZ) / 2 - (Math.sin(pitch) * RAMP.thickness) / 2 },
    { x: HALF_W, y: RAMP.thickness / 2, z: run / 2 },
    0.06,
    quatAboutX(pitch),
  );

  const shelf = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, SHELF.top / 2, SHELF.min - SHELF.length / 2));
  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF_W, SHELF.top / 2, SHELF.length / 2).setFriction(0.5).setRestitution(0.05), shelf);
  return shelf;
};

type Placement = { x: number; y: number; z: number; rotation?: { x: number; y: number; z: number; w: number }; velocity?: { x: number; y: number; z: number } };

const addCoin = (physics: Physics, kind: CoinKind, at: Placement): Piece => {
  const spec = COINS[kind];
  const body = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(at.x, at.y, at.z)
      .setRotation(at.rotation ?? quatAboutX(0))
      .setLinvel(at.velocity?.x ?? 0, at.velocity?.y ?? 0, at.velocity?.z ?? 0)
      .setAngularDamping(0.6)
      .setLinearDamping(0.05),
  );
  physics.world.createCollider(RAPIER.ColliderDesc.cylinder(spec.thickness / 2, spec.radius).setFriction(0.36).setRestitution(0.12).setDensity(1), body);
  const piece: Piece = { type: 'coin', kind, body };
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

const quatAboutY = (angle: number) => ({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) });

/** Scatters coins over the shelf and the bed in loose layers and lets them come to rest, then lays the first cards on top. */
const prefill = (physics: Physics) => {
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
  for (let n = 0; n < 2; n++) layer(RAMP.endZ + 0.2, SHELF.min - 0.5, SHELF.top + 0.5, (n % 2) * 0.5);
  for (let n = 0; n < 11; n++) layer(SHELF.max + 0.75, BED_FRONT - 0.8, 0.8, (n % 3) * 0.45);
  for (let n = 0; n < 5; n++) addCoin(physics, 'large', { x: -3.6 + n * 1.8, y: 2.2, z: 6.6 + (n % 2) * 1.2 });
  for (let i = 0; i < 90; i++) advance(physics);
  for (let n = 0; n < CARDS_ON_BED; n++) {
    addCard(physics, n, { x: -3 + n * 3, y: 2.4, z: 6.3 + (n % 2) * 0.8, rotation: quatAboutY((random() - 0.5) * 1.2) });
  }
  for (let i = 0; i < 120; i++) advance(physics);
};

export const createPhysics = async (seed = 11): Promise<Physics> => {
  await RAPIER.init();
  random = mulberry(seed);
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = STEP;
  world.numSolverIterations = 8;
  const shelf = buildCabinet(world);
  const physics: Physics = { world, pieces: [], time: 0, shelfFront: SHELF.min, wheelAngle: 0, held: undefined, next: 'small', clinks: 0 };
  shelves.set(physics, shelf);
  prefill(physics);
  physics.held = pickCoin();
  physics.next = pickCoin();
  return physics;
};

const shelves = new WeakMap<Physics, RAPIER.RigidBody>();
const reloadAt = new WeakMap<Physics, number>();
const dropped = new WeakMap<Physics, number>();
const nextCard = new WeakMap<Physics, number>();
const events = new WeakMap<Physics, RAPIER.EventQueue>();

/** Where the held coin sits: on the wheel's rim, flat against the board. */
export const heldPlace = (physics: Physics, kind: CoinKind) =>
  onBoard(Math.cos(physics.wheelAngle) * WHEEL.radius, WHEEL.up + Math.sin(physics.wheelAngle) * WHEEL.radius, COINS[kind].thickness / 2 + 0.03);

/** How many coins are loose in the cabinet. */
export const coinCount = (physics: Physics): number => physics.pieces.reduce((n, piece) => n + (piece.type === 'coin' ? 1 : 0), 0);

/**
 * Lets go of the coin on the wheel. It leaves along the rim's direction of travel, sliding on the board. Returns the kind released,
 * or undefined if the wheel was empty or the cabinet is full.
 */
export const release = (physics: Physics): CoinKind | undefined => {
  const kind = physics.held;
  if (kind === undefined || coinCount(physics) >= MAX_COINS) return undefined;
  const at = heldPlace(physics, kind);
  const speed = WHEEL.radius * WHEEL.spin;
  const across = -Math.sin(physics.wheelAngle) * speed;
  const up = Math.cos(physics.wheelAngle) * speed;
  const piece = addCoin(physics, kind, { ...at, rotation: FLAT_ON_BOARD, velocity: { x: across, y: BOARD_UP.y * up, z: BOARD_UP.z * up } });
  piece.body.collider(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  physics.held = undefined;
  reloadAt.set(physics, physics.time + WHEEL.reload);

  const count = (dropped.get(physics) ?? 0) + 1;
  dropped.set(physics, count);
  const cards = physics.pieces.filter((p) => p.type === 'card').length;
  if (count % COINS_PER_CARD === 0 && cards < CARDS_ON_BED + 1) {
    const card = nextCard.get(physics) ?? CARDS_ON_BED;
    nextCard.set(physics, card + 1);
    addCard(physics, card % CARD_NAMES.length, { x: (random() - 0.5) * 6, y: SHELF.top + 2.6, z: WIPER.z + 1.5, rotation: quatAboutY((random() - 0.5) * 1.6) });
  }
  return kind;
};

/** Moves everything on by one step of STEP seconds, and returns what went down the chute. */
export const advance = (physics: Physics): Fall[] => {
  physics.time += STEP;
  physics.shelfFront = shelfFrontAt(physics.time);
  shelves.get(physics)!.setNextKinematicTranslation({ x: 0, y: SHELF.top / 2, z: physics.shelfFront - SHELF.length / 2 });

  let queue = events.get(physics);
  if (!queue) {
    queue = new RAPIER.EventQueue(true);
    events.set(physics, queue);
  }
  physics.world.step(queue);
  physics.clinks = 0;
  queue.drainCollisionEvents((_a, _b, started) => {
    if (started) physics.clinks++;
  });

  const shake = Math.round(physics.time / STEP) % 45 === 0;
  const falls: Fall[] = [];
  for (let i = physics.pieces.length - 1; i >= 0; i--) {
    const piece = physics.pieces[i]!;
    const at = piece.body.translation();
    // A coin that has come to a stop on the board is wedged. Real machines rattle the board for this; so does this one.
    if (shake && at.z < WIPER.z - 0.2 && at.y > WIPER.top + 0.5) {
      const v = piece.body.linvel();
      if (Math.hypot(v.x, v.y, v.z) < 0.4) {
        const kick = piece.body.mass() * 3;
        piece.body.applyImpulse({ x: (random() - 0.5) * kick * 1.5, y: -BOARD_UP.y * kick, z: -BOARD_UP.z * kick }, true);
      }
    }
    if (at.y > CHUTE_Y) continue;
    falls.push({ piece, x: at.x });
    physics.world.removeRigidBody(piece.body);
    physics.pieces.splice(i, 1);
  }

  physics.wheelAngle += WHEEL.spin * STEP;
  if (physics.wheelAngle > Math.PI) physics.wheelAngle -= Math.PI * 2;
  if (physics.held === undefined && physics.time >= (reloadAt.get(physics) ?? 0)) {
    physics.held = physics.next;
    physics.next = pickCoin();
  }
  return falls;
};

/** Where on the board's cover and out of it a point is, for anything that wants to draw against the board. */
export const BOARD_AXES = { up: BOARD_UP, out: BOARD_OUT } as const;
