/**
 * The physics of the cabinet: orbs as spheres, the beds and walls as boxes, and the shelf as a box that slides. Plain TypeScript with
 * no React or native imports, so it can be run and tuned outside the app.
 *
 * It takes many small steps and resolves each contact once per step, which keeps deep piles calm where a few large steps would
 * jitter. Orbs do not spin: they slide against each other with friction, which is what lets a heap hold a slope and ride the shelf.
 */
import { BACK_Z, BED_FRONT, GLASS_Z, HALF_W, pusherAt, RIM, SHELF_Y, WHEEL, WIN_HALF_W } from './machine';

export const MAX_ORBS = 170;

/** Simulation ticks per second, and solver passes within each. */
export const STEP_HZ = 120;
const SUBSTEPS = 3;

const GRAVITY = 1500;
const RESTITUTION = 0.2;
/** Below this closing speed a contact does not bounce, so resting orbs stay at rest. */
const BOUNCE_SPEED = 110;
const FRICTION_ORB = 0.3;
const FRICTION_SURFACE = 0.3;
const FRICTION_SHELF = 0.55;
/** Overlap the solver tolerates, so resting contacts persist from tick to tick. */
const SLOP = 0.04;
const MAX_SPEED = 1100;

const MIN_RADIUS = 10.5;
const RADIUS_SPREAD = 2.5;
export const MAX_RADIUS = MIN_RADIUS + RADIUS_SPREAD;

/** Orbs below this have left the cabinet. */
const FLOOR_Y = -70;

const CELL = MAX_RADIUS * 2 + 1;
const GRID_X0 = -HALF_W - CELL;
const GRID_Z0 = -CELL;
const COLS = Math.ceil((HALF_W * 2 + CELL * 2) / CELL);
const ROWS = Math.ceil((GLASS_Z + CELL * 2) / CELL);

type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

/** Far enough out that an orb never meets a box's side where the cabinet wall already stands. */
const WIDE = 500;

const BED: Box = { x0: -WIDE, x1: WIDE, y0: -200, y1: 0, z0: -100, z1: BED_FRONT };
const BACK_WALL: Box = { x0: -WIDE, x1: WIDE, y0: SHELF_Y, y1: 900, z0: -100, z1: BACK_Z };

export type Sim = {
  time: number;
  px: Float64Array;
  py: Float64Array;
  pz: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  vz: Float64Array;
  radius: Float64Array;
  invMass: Float64Array;
  active: Uint8Array;
  /** The slot seated on the wheel, or -1 while the wheel is empty. */
  held: number;
  reloadAt: number;
  wheelAngle: number;
  /** Orbs loose in the cabinet, not counting the one on the wheel. */
  loose: number;
  /** Orbs that went over the paying middle of the front edge. */
  won: number;
  /** Orbs that went over the front edge too near a wall. */
  lost: number;
  /** The shelf's front edge and its speed towards the player, this tick. */
  shelfFront: number;
  shelfSpeed: number;
  shelf: Box;
  cellHead: Int32Array;
  cellNext: Int32Array;
};

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

export const createSim = (seed = 7): Sim => {
  const random = mulberry(seed);
  const radius = new Float64Array(MAX_ORBS);
  const invMass = new Float64Array(MAX_ORBS);
  for (let i = 0; i < MAX_ORBS; i++) {
    const r = MIN_RADIUS + RADIUS_SPREAD * random();
    radius[i] = r;
    invMass[i] = (MIN_RADIUS * MIN_RADIUS * MIN_RADIUS) / (r * r * r);
  }
  const sim: Sim = {
    time: 0,
    px: new Float64Array(MAX_ORBS),
    py: new Float64Array(MAX_ORBS),
    pz: new Float64Array(MAX_ORBS),
    vx: new Float64Array(MAX_ORBS),
    vy: new Float64Array(MAX_ORBS),
    vz: new Float64Array(MAX_ORBS),
    radius,
    invMass,
    active: new Uint8Array(MAX_ORBS),
    held: -1,
    reloadAt: 0,
    wheelAngle: 0,
    loose: 0,
    won: 0,
    lost: 0,
    shelfFront: 0,
    shelfSpeed: 0,
    shelf: { x0: -WIDE, x1: WIDE, y0: -100, y1: SHELF_Y, z0: -400, z1: 0 },
    cellHead: new Int32Array(COLS * ROWS),
    cellNext: new Int32Array(MAX_ORBS),
  };
  prefill(sim, random);
  return sim;
};

const freeSlot = (sim: Sim): number => {
  for (let i = 0; i < MAX_ORBS; i++) if (!sim.active[i]) return i;
  return -1;
};

const spawn = (sim: Sim, x: number, y: number, z: number) => {
  const i = freeSlot(sim);
  if (i < 0) return;
  sim.active[i] = 1;
  sim.px[i] = x;
  sim.py[i] = y;
  sim.pz[i] = z;
  sim.vx[i] = 0;
  sim.vy[i] = 0;
  sim.vz[i] = 0;
  sim.loose++;
};

/** Lays a starting spread on the shelf and the bed and lets it settle, so the first drop already has something to push. */
const prefill = (sim: Sim, random: () => number) => {
  const pitch = MAX_RADIUS * 2 + 1.5;
  const jitter = () => (random() - 0.5) * 3;
  for (let z = BACK_Z + pitch * 0.6; z < 118 - MAX_RADIUS; z += pitch) {
    for (let x = -HALF_W + pitch * 0.6; x < HALF_W - MAX_RADIUS; x += pitch) spawn(sim, x + jitter(), SHELF_Y + MAX_RADIUS + 2, z + jitter());
  }
  for (let layer = 0; layer < 2; layer++) {
    const inset = layer * pitch * 0.5;
    for (let z = 176 + pitch * 0.7 + inset; z < BED_FRONT - pitch - inset; z += pitch) {
      for (let x = -HALF_W + pitch * 0.6 + inset; x < HALF_W - MAX_RADIUS - inset; x += pitch) {
        spawn(sim, x + jitter(), MAX_RADIUS + 2 + layer * pitch, z + jitter());
      }
    }
  }
  for (let i = 0; i < 2 * STEP_HZ; i++) step(sim);
  sim.won = 0;
  sim.lost = 0;
};

/** The speed an orb leaves the wheel at, sideways. */
const FLING_SPEED = WHEEL.radius * WHEEL.spin * WHEEL.fling;

/** Lets go of the orb on the wheel. It leaves along the rim's direction of travel. Returns whether there was one to release. */
export const release = (sim: Sim): boolean => {
  const i = sim.held;
  if (i < 0) return false;
  sim.vx[i] = -Math.sin(sim.wheelAngle) * FLING_SPEED;
  sim.vy[i] = 0;
  sim.vz[i] = Math.cos(sim.wheelAngle) * FLING_SPEED;
  sim.held = -1;
  sim.loose++;
  sim.reloadAt = sim.time + WHEEL.reload;
  return true;
};

/** Where the orb on the wheel would first touch down if let go this instant, ignoring anything already lying there. */
export const aim = (sim: Sim): { x: number; y: number; z: number } => {
  const fromX = Math.cos(sim.wheelAngle) * WHEEL.radius;
  const fromZ = WHEEL.z + Math.sin(sim.wheelAngle) * WHEEL.radius;
  const land = (surface: number) => {
    const t = Math.sqrt((2 * (WHEEL.y - surface - MAX_RADIUS)) / GRAVITY);
    const x = fromX - Math.sin(sim.wheelAngle) * FLING_SPEED * t;
    const z = fromZ + Math.cos(sim.wheelAngle) * FLING_SPEED * t;
    return { x: Math.max(-HALF_W + MAX_RADIUS, Math.min(HALF_W - MAX_RADIUS, x)), y: surface, z: Math.max(BACK_Z + MAX_RADIUS, z) };
  };
  const onShelf = land(SHELF_Y);
  return onShelf.z <= sim.shelfFront ? onShelf : land(0);
};

const seatOnWheel = (sim: Sim) => {
  const i = sim.held;
  sim.px[i] = Math.cos(sim.wheelAngle) * WHEEL.radius;
  sim.py[i] = WHEEL.y;
  sim.pz[i] = WHEEL.z + Math.sin(sim.wheelAngle) * WHEEL.radius;
  sim.vx[i] = 0;
  sim.vy[i] = 0;
  sim.vz[i] = 0;
};

const reload = (sim: Sim) => {
  const i = freeSlot(sim);
  if (i < 0) return;
  sim.active[i] = 1;
  sim.held = i;
  seatOnWheel(sim);
};

/** Piles are only a few orbs deep, so orbs are sorted into columns by where they stand and height is checked pair by pair. */
const buildGrid = (sim: Sim) => {
  const { cellHead, cellNext, active, px, pz, held } = sim;
  cellHead.fill(-1);
  for (let i = 0; i < MAX_ORBS; i++) {
    if (!active[i] || i === held) continue;
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor((px[i]! - GRID_X0) / CELL)));
    const cz = Math.min(ROWS - 1, Math.max(0, Math.floor((pz[i]! - GRID_Z0) / CELL)));
    cellNext[i] = cellHead[cz * COLS + cx]!;
    cellHead[cz * COLS + cx] = i;
  }
};

/**
 * Stops one orb closing on a surface along normal n, bounces it if it arrived fast, and rubs it against the surface's own speed
 * towards the player. The surface is immovable.
 */
const hitSurface = (sim: Sim, i: number, nx: number, ny: number, nz: number, surfaceVz: number, friction: number) => {
  const { vx, vy, vz } = sim;
  const vn = vx[i]! * nx + vy[i]! * ny + (vz[i]! - surfaceVz) * nz;
  if (vn >= 0) return;
  const j = vn < -BOUNCE_SPEED ? -(1 + RESTITUTION) * vn : -vn;
  vx[i] = vx[i]! + nx * j;
  vy[i] = vy[i]! + ny * j;
  vz[i] = vz[i]! + nz * j;
  const rz = vz[i]! - surfaceVz;
  const along = vx[i]! * nx + vy[i]! * ny + rz * nz;
  const tx = vx[i]! - nx * along;
  const ty = vy[i]! - ny * along;
  const tz = rz - nz * along;
  const slide = Math.hypot(tx, ty, tz);
  if (slide < 1e-9) return;
  const rub = Math.min(friction * j, slide) / slide;
  vx[i] = vx[i]! - tx * rub;
  vy[i] = vy[i]! - ty * rub;
  vz[i] = vz[i]! - tz * rub;
};

const hitOrb = (sim: Sim, i: number, k: number, nx: number, ny: number, nz: number) => {
  const { vx, vy, vz, invMass } = sim;
  const wi = invMass[i]!;
  const wk = invMass[k]!;
  const w = wi + wk;
  const vn = (vx[k]! - vx[i]!) * nx + (vy[k]! - vy[i]!) * ny + (vz[k]! - vz[i]!) * nz;
  if (vn >= 0) return;
  const j = (vn < -BOUNCE_SPEED ? -(1 + RESTITUTION) * vn : -vn) / w;
  vx[i] = vx[i]! - nx * j * wi;
  vy[i] = vy[i]! - ny * j * wi;
  vz[i] = vz[i]! - nz * j * wi;
  vx[k] = vx[k]! + nx * j * wk;
  vy[k] = vy[k]! + ny * j * wk;
  vz[k] = vz[k]! + nz * j * wk;
  const rx = vx[k]! - vx[i]!;
  const ry = vy[k]! - vy[i]!;
  const rz = vz[k]! - vz[i]!;
  const along = rx * nx + ry * ny + rz * nz;
  const tx = rx - nx * along;
  const ty = ry - ny * along;
  const tz = rz - nz * along;
  const slide = Math.hypot(tx, ty, tz);
  if (slide < 1e-9) return;
  const rub = Math.min(FRICTION_ORB * j, slide / w) / slide;
  vx[i] = vx[i]! + tx * rub * wi;
  vy[i] = vy[i]! + ty * rub * wi;
  vz[i] = vz[i]! + tz * rub * wi;
  vx[k] = vx[k]! - tx * rub * wk;
  vy[k] = vy[k]! - ty * rub * wk;
  vz[k] = vz[k]! - tz * rub * wk;
};

/**
 * Visits every pair of orbs close enough to touch. With `separate` it pushes overlapping pairs apart; without, it resolves their
 * closing speed. The two are run either side of moving the orbs, so overlap is never turned into speed.
 */
const eachPair = (sim: Sim, separate: boolean) => {
  const { cellHead, cellNext, px, py, pz, radius, invMass } = sim;
  for (let cz = 0; cz < ROWS; cz++) {
    for (let cx = 0; cx < COLS; cx++) {
      for (let i = cellHead[cz * COLS + cx]!; i >= 0; i = cellNext[i]!) {
        // This cell's later orbs, then the four neighbouring cells not yet visited: each pair is met once.
        for (let n = 0; n < 5; n++) {
          const ox = n === 0 ? 0 : n === 1 ? 1 : n - 3;
          const oz = n < 2 ? 0 : 1;
          const nxCell = cx + ox;
          const nzCell = cz + oz;
          if (nxCell < 0 || nxCell >= COLS || nzCell >= ROWS) continue;
          for (let k = n === 0 ? cellNext[i]! : cellHead[nzCell * COLS + nxCell]!; k >= 0; k = cellNext[k]!) {
            const dx = px[k]! - px[i]!;
            const dy = py[k]! - py[i]!;
            const dz = pz[k]! - pz[i]!;
            const reach = radius[i]! + radius[k]!;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= reach * reach) continue;
            const d = Math.sqrt(d2);
            const nx = d > 1e-6 ? dx / d : 0;
            const ny = d > 1e-6 ? dy / d : 1;
            const nz = d > 1e-6 ? dz / d : 0;
            if (!separate) {
              hitOrb(sim, i, k, nx, ny, nz);
              continue;
            }
            const overlap = reach - d - SLOP;
            if (overlap <= 0) continue;
            const wi = invMass[i]!;
            const wk = invMass[k]!;
            const push = (overlap * 0.5) / (wi + wk);
            px[i] = px[i]! - nx * push * wi;
            py[i] = py[i]! - ny * push * wi;
            pz[i] = pz[i]! - nz * push * wi;
            px[k] = px[k]! + nx * push * wk;
            py[k] = py[k]! + ny * push * wk;
            pz[k] = pz[k]! + nz * push * wk;
          }
        }
      }
    }
  }
};

/** Resolves, or with `separate` un-overlaps, one orb against a surface it is `depth` into along normal n. */
const touch = (sim: Sim, i: number, nx: number, ny: number, nz: number, depth: number, surfaceVz: number, friction: number, separate: boolean) => {
  if (!separate) hitSurface(sim, i, nx, ny, nz, surfaceVz, friction);
  else if (depth > SLOP) {
    sim.px[i] = sim.px[i]! + nx * (depth - SLOP);
    sim.py[i] = sim.py[i]! + ny * (depth - SLOP);
    sim.pz[i] = sim.pz[i]! + nz * (depth - SLOP);
  }
};

const touchBox = (sim: Sim, i: number, box: Box, surfaceVz: number, friction: number, separate: boolean) => {
  const x = sim.px[i]!;
  const y = sim.py[i]!;
  const z = sim.pz[i]!;
  const r = sim.radius[i]!;
  if (x + r < box.x0 || x - r > box.x1 || y + r < box.y0 || y - r > box.y1 || z + r < box.z0 || z - r > box.z1) return;
  const dx = x - Math.max(box.x0, Math.min(box.x1, x));
  const dy = y - Math.max(box.y0, Math.min(box.y1, y));
  const dz = z - Math.max(box.z0, Math.min(box.z1, z));
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    touch(sim, i, dx / d, dy / d, dz / d, r - d, surfaceVz, friction, separate);
    return;
  }
  // Swallowed by the box: leave through whichever face is nearest.
  const up = box.y1 - y;
  const down = y - box.y0;
  const front = box.z1 - z;
  const back = z - box.z0;
  const right = box.x1 - x;
  const left = x - box.x0;
  const nearest = Math.min(up, down, front, back, right, left);
  if (nearest === up) touch(sim, i, 0, 1, 0, up + r, surfaceVz, friction, separate);
  else if (nearest === front) touch(sim, i, 0, 0, 1, front + r, surfaceVz, friction, separate);
  else if (nearest === down) touch(sim, i, 0, -1, 0, down + r, surfaceVz, friction, separate);
  else if (nearest === back) touch(sim, i, 0, 0, -1, back + r, surfaceVz, friction, separate);
  else if (nearest === right) touch(sim, i, 1, 0, 0, right + r, surfaceVz, friction, separate);
  else touch(sim, i, -1, 0, 0, left + r, surfaceVz, friction, separate);
};

/** The same two passes as eachPair, for each orb against the cabinet. */
const eachSurface = (sim: Sim, separate: boolean) => {
  const { px, py, pz, radius, active, held } = sim;
  for (let i = 0; i < MAX_ORBS; i++) {
    if (!active[i] || i === held) continue;
    const r = radius[i]!;
    touchBox(sim, i, BED, 0, FRICTION_SURFACE, separate);
    touchBox(sim, i, BACK_WALL, 0, FRICTION_SURFACE, separate);
    touchBox(sim, i, sim.shelf, sim.shelfSpeed, FRICTION_SHELF, separate);

    if (px[i]! < -HALF_W + r) touch(sim, i, 1, 0, 0, -HALF_W + r - px[i]!, 0, FRICTION_SURFACE, separate);
    if (px[i]! > HALF_W - r) touch(sim, i, -1, 0, 0, px[i]! - HALF_W + r, 0, FRICTION_SURFACE, separate);
    if (pz[i]! > GLASS_Z - r) touch(sim, i, 0, 0, -1, pz[i]! - GLASS_Z + r, 0, FRICTION_SURFACE, separate);

    // The rim is a rod lying across the bed's front edge.
    const dy = py[i]!;
    const dz = pz[i]! - RIM.z;
    const reach = r + RIM.radius;
    const d2 = dy * dy + dz * dz;
    if (d2 < reach * reach && d2 > 1e-9) {
      const d = Math.sqrt(d2);
      touch(sim, i, 0, dy / d, dz / d, reach - d, 0, FRICTION_SURFACE, separate);
    }
  }
};

/** Advances the cabinet by one tick of 1 / STEP_HZ seconds. */
export const step = (sim: Sim) => {
  const h = 1 / STEP_HZ / SUBSTEPS;
  const { px, py, pz, vx, vy, vz, active } = sim;
  for (let n = 0; n < SUBSTEPS; n++) {
    sim.time += h;
    const { front, speed } = pusherAt(sim.time);
    sim.shelfFront = front;
    sim.shelfSpeed = speed;
    sim.shelf.z1 = front;
    for (let i = 0; i < MAX_ORBS; i++) {
      if (active[i] && i !== sim.held) vy[i] = vy[i]! - GRAVITY * h;
    }
    buildGrid(sim);
    eachPair(sim, false);
    eachSurface(sim, false);
    for (let i = 0; i < MAX_ORBS; i++) {
      if (!active[i] || i === sim.held) continue;
      const speedNow = Math.hypot(vx[i]!, vy[i]!, vz[i]!);
      if (speedNow > MAX_SPEED) {
        vx[i] = (vx[i]! / speedNow) * MAX_SPEED;
        vy[i] = (vy[i]! / speedNow) * MAX_SPEED;
        vz[i] = (vz[i]! / speedNow) * MAX_SPEED;
      }
      px[i] = px[i]! + vx[i]! * h;
      py[i] = py[i]! + vy[i]! * h;
      pz[i] = pz[i]! + vz[i]! * h;
    }
    eachPair(sim, true);
    eachSurface(sim, true);
  }

  for (let i = 0; i < MAX_ORBS; i++) {
    if (!active[i] || i === sim.held || py[i]! > FLOOR_Y) continue;
    active[i] = 0;
    sim.loose--;
    if (Math.abs(px[i]!) <= WIN_HALF_W) sim.won++;
    else sim.lost++;
  }

  sim.wheelAngle += WHEEL.spin / STEP_HZ;
  if (sim.wheelAngle > Math.PI) sim.wheelAngle -= Math.PI * 2;
  if (sim.held >= 0) seatOnWheel(sim);
  else if (sim.time >= sim.reloadAt) reload(sim);
};
