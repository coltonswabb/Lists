/**
 * The cabinet as the player sees it, standing in front of the glass. Three.js draws it; the physics decides where everything is.
 * Web only: it runs inside the DOM component.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { boardArt, cardFace, coinFace } from './art';
import {
  BED_FRONT,
  BOARD,
  CARD,
  COIN_KINDS,
  type CoinKind,
  COINS,
  GLASS_Z,
  HALF_W,
  landingForward,
  onBoard,
  RIDE_TIME,
  RING,
  SHELF,
  TRACK,
  TRACK_LENGTH,
  trackAt,
  trackYawAt,
  WIPER,
} from './cabinet';
import { MAX_COINS, onTrack, type Physics } from './physics';

const INK = 0x05071a;
const LACQUER = 0x141a44;
const BRASS = 0xc9a15a;
const CORAL = 0xff6b5a;

const COIN_METAL: Record<CoinKind, { colour: number; roughness: number }> = {
  small: { colour: 0xdfe3ee, roughness: 0.3 },
  medium: { colour: 0xf2c14e, roughness: 0.26 },
  large: { colour: 0xff8f6b, roughness: 0.22 },
};

const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -BOARD.lean);

export type Scene = {
  /** Redraws the cabinet from the physics. `pulse` is 0 to 1: how brightly the cabinet lights are flaring. */
  draw: (physics: Physics, pulse: number) => void;
  resize: (width: number, height: number) => void;
  /** Throws a burst of sparks up from the chute, at a point across the cabinet. */
  sparkle: (x: number, colour: number, count: number) => void;
  /** Where on the page a point across the chute sits, for placing words over the picture. */
  chuteOnScreen: (x: number) => { x: number; y: number };
  dispose: () => void;
};

const coinMaterials = (kind: CoinKind): THREE.Material[] => {
  const face = coinFace(kind);
  const metal = COIN_METAL[kind];
  const rim = new THREE.MeshStandardMaterial({ color: metal.colour, metalness: 1, roughness: metal.roughness + 0.12 });
  const top = new THREE.MeshStandardMaterial({ color: metal.colour, metalness: 1, roughness: metal.roughness, bumpMap: face, bumpScale: 2.2, roughnessMap: face });
  return [rim, top, top];
};

const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
};

const SPARKS = 220;
/** The ring of moon phases painted on the backboard: how far up the board, and how wide. */
const MOON_RING = { up: 4.6, radius: 1.5 } as const;
/** The board is drawn taller than the part coins can reach, so it runs off the top of the screen instead of ending in mid-air. */
const BOARD_SHOWN = BOARD.length + 9;
/** Half the angle the camera sees across the cabinet, and the screen shape that angle is meant for. */
const HALF_VIEW_ACROSS = THREE.MathUtils.degToRad(17);
const PHONE_ASPECT = 0.56;

export const createScene = (canvas: HTMLCanvasElement): Scene => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Metal has no colour of its own to show: it needs a room to reflect.
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 120);

  const key = new THREE.DirectionalLight(0xfff1dc, 1.7);
  key.position.set(-5, 20, 15);
  key.target.position.set(0, 0, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 4;
  key.shadow.camera.far = 50;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0x7f8cff, 0x1a0e24, 0.5));
  const warm = new THREE.PointLight(0xffb38a, 26, 26, 1.6);
  warm.position.set(0, 6.5, 7.5);
  scene.add(warm);
  const flare = new THREE.PointLight(CORAL, 0, 30, 1.4);
  flare.position.set(0, 2.5, BED_FRONT - 1);
  scene.add(flare);

  const lacquer = new THREE.MeshStandardMaterial({ color: LACQUER, metalness: 0.35, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0d26, metalness: 0.2, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 1, roughness: 0.34 });
  const dullBrass = new THREE.MeshStandardMaterial({ color: 0x8a6a34, metalness: 0.9, roughness: 0.5 });
  const shelfTop = new THREE.MeshStandardMaterial({ color: 0x1d2660, metalness: 0.5, roughness: 0.3 });
  const glowCoral = new THREE.MeshStandardMaterial({ color: 0x220806, emissive: CORAL, emissiveIntensity: 1.6 });
  const glowMoon = new THREE.MeshStandardMaterial({ color: 0x10142e, emissive: 0x8fa4ff, emissiveIntensity: 1.1 });

  // The bed, with a lit lip along the edge everything is trying to get over.
  scene.add(box(HALF_W * 2, 3, BED_FRONT + 2, lacquer, 0, -1.5, BED_FRONT / 2 - 1));
  const lip = box(HALF_W * 2, 0.12, 0.14, glowCoral, 0, -0.07, BED_FRONT + 0.06);
  scene.add(lip);
  scene.add(box(HALF_W * 2 + 4, 0.4, 8, dark, 0, -4.4, BED_FRONT + 2));

  for (const side of [-1, 1]) {
    scene.add(box(0.4, 34, GLASS_Z + 6, lacquer, side * (HALF_W + 0.2), 8, (GLASS_Z - 6) / 2));
    scene.add(box(0.08, 14, 0.2, glowMoon, side * (HALF_W - 0.03), 5.4, BED_FRONT - 0.6));
    scene.add(box(0.08, 0.2, 6.5, glowMoon, side * (HALF_W - 0.03), 1.9, BED_FRONT - 3.9));
  }

  const shelf = new THREE.Group();
  shelf.add(box(HALF_W * 2 - 0.02, SHELF.top, SHELF.length, shelfTop, 0, SHELF.top / 2, -SHELF.length / 2));
  shelf.add(box(HALF_W * 2 - 0.02, SHELF.top, 0.05, brass, 0, SHELF.top / 2, -0.02));
  shelf.add(box(HALF_W * 2 - 0.02, 0.1, 0.06, glowCoral, 0, SHELF.top * 0.5, 0.04));
  shelf.children.forEach((child) => (child.castShadow = true));
  scene.add(shelf);

  scene.add(box(HALF_W * 2, WIPER.top - SHELF.top - 0.03, 4, lacquer, 0, (WIPER.top + SHELF.top + 0.03) / 2, WIPER.z - 2));
  scene.add(box(HALF_W * 2, 0.1, 0.08, glowMoon, 0, WIPER.top - 0.05, WIPER.z + 0.03));

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(HALF_W * 2, BOARD_SHOWN, BOARD.thickness),
    new THREE.MeshStandardMaterial({ map: boardArt(HALF_W * 2, BOARD_SHOWN, MOON_RING.up, MOON_RING.radius), metalness: 0.2, roughness: 0.5 }),
  );
  board.position.copy(new THREE.Vector3().copy(onBoard(0, BOARD_SHOWN / 2, -BOARD.thickness / 2)));
  board.quaternion.copy(lean);
  board.receiveShadow = true;
  scene.add(board);

  // The sill under the glass, where the outside of the cabinet begins.
  scene.add(box(HALF_W * 2 + 0.8, 5, 0.6, dark, 0, -3.4, GLASS_Z + 0.3));
  scene.add(box(HALF_W * 2 + 0.8, 0.1, 0.62, brass, 0, -0.9, GLASS_Z + 0.3));

  // The track is built pointing straight at the player, standing on its post; turning the group about the post swings it.
  const track = new THREE.Group();
  track.position.set(0, 0, TRACK.pivotZ);
  const railPoints = (side: number) =>
    Array.from({ length: 49 }, (_, n) => {
      const at = trackAt((n / 48) * TRACK_LENGTH);
      return new THREE.Vector3(side * TRACK.gauge, at.height, at.forward);
    });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints(side)), 96, 0.045, 8), brass);
    rail.castShadow = true;
    track.add(rail);
  }
  for (let n = 0; n <= 16; n++) {
    const at = trackAt((n / 16) * TRACK_LENGTH);
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, TRACK.gauge * 2 + 0.12, 6), brass);
    tie.rotation.z = Math.PI / 2;
    tie.position.set(0, at.height - 0.03, at.forward);
    track.add(tie);
  }
  // A strut from the dip back to the wall, so the track is visibly held up by something.
  const dip = trackAt(TRACK_LENGTH * 0.82);
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), dullBrass);
  const strutFrom = new THREE.Vector3(0, dip.height - 0.05, dip.forward);
  const strutTo = new THREE.Vector3(0, dip.height + 0.9, 1.0);
  strut.position.copy(strutFrom).add(strutTo).multiplyScalar(0.5);
  strut.scale.y = strutFrom.distanceTo(strutTo);
  strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutTo.clone().sub(strutFrom).normalize());
  track.add(strut);
  scene.add(track);

  // The ring rides an arc about the same post, facing it.
  const ringArm = new THREE.Group();
  ringArm.position.set(0, 0, TRACK.pivotZ);
  const ringGlow = new THREE.MeshStandardMaterial({ color: 0x2a0d08, emissive: CORAL, emissiveIntensity: 2.2 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING.radius, 0.07, 12, 64), ringGlow);
  ring.position.set(0, RING.height, RING.forward);
  ringArm.add(ring);
  const ringRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 9, 6), dullBrass);
  ringRod.position.set(0, RING.height + RING.radius + 4.5, RING.forward);
  ringArm.add(ringRod);
  scene.add(ringArm);

  const geometries = {} as Record<CoinKind, THREE.CylinderGeometry>;
  const materials = {} as Record<CoinKind, THREE.Material[]>;
  const coins = {} as Record<CoinKind, THREE.InstancedMesh>;
  for (const kind of COIN_KINDS) {
    geometries[kind] = new THREE.CylinderGeometry(COINS[kind].radius, COINS[kind].radius, COINS[kind].thickness, 40);
    materials[kind] = coinMaterials(kind);
    const mesh = new THREE.InstancedMesh(geometries[kind], materials[kind], MAX_COINS + 4);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    coins[kind] = mesh;
    scene.add(mesh);
  }

  const cardGeometry = new THREE.BoxGeometry(CARD.width, CARD.thickness, CARD.length);
  const cardEdge = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.6 });
  const cardBack = new THREE.MeshStandardMaterial({ color: 0x1a2160, roughness: 0.5, metalness: 0.2 });
  const cardFaces = new Map<number, THREE.Material>();
  const cardMeshes = new Map<object, THREE.Mesh>();
  const faceOf = (card: number): THREE.Material => {
    let face = cardFaces.get(card);
    if (!face) {
      face = new THREE.MeshStandardMaterial({ map: cardFace(card), roughness: 0.34, metalness: 0.1 });
      cardFaces.set(card, face);
    }
    return face;
  };

  // A disc of light on the pile showing where a coin let go now would come down.
  const aim = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 40), new THREE.MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.85, depthTest: false }));
  aim.rotation.x = -Math.PI / 2;
  aim.renderOrder = 5;
  scene.add(aim);
  const AIM_HEIGHT = SHELF.top + 0.5;
  const aimForward = landingForward(AIM_HEIGHT);

  const sparkPositions = new Float32Array(SPARKS * 3).fill(-999);
  const sparkColours = new Float32Array(SPARKS * 3);
  const sparkVelocity = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColours, 3));
  const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let nextSpark = 0;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const charge = new THREE.Color(0xa8f6ff);
  const plain = new THREE.Color(0xffffff);
  const counts: Record<CoinKind, number> = { small: 0, medium: 0, large: 0 };
  let lastDraw = performance.now();

  /** Puts a coin that is on the track, or waiting at the top of it, in with the loose ones. */
  const place = (kind: CoinKind, distance: number, yaw: number, roll: number) => {
    const seat = onTrack(kind, distance, yaw, roll);
    position.set(seat.position.x, seat.position.y, seat.position.z);
    rotation.set(seat.rotation.x, seat.rotation.y, seat.rotation.z, seat.rotation.w);
    coins[kind].setColorAt(counts[kind], plain);
    coins[kind].setMatrixAt(counts[kind]++, matrix.compose(position, rotation, one));
  };

  const draw: Scene['draw'] = (physics, pulse) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastDraw) / 1000);
    lastDraw = now;

    counts.small = counts.medium = counts.large = 0;
    const seen = new Set<object>();
    for (const piece of physics.pieces) {
      const at = piece.body.translation();
      const turn = piece.body.rotation();
      position.set(at.x, at.y, at.z);
      rotation.set(turn.x, turn.y, turn.z, turn.w);
      if (piece.type === 'coin') {
        coins[piece.kind].setColorAt(counts[piece.kind], piece.charged ? charge : plain);
        coins[piece.kind].setMatrixAt(counts[piece.kind]++, matrix.compose(position, rotation, one));
        continue;
      }
      seen.add(piece);
      let mesh = cardMeshes.get(piece);
      if (!mesh) {
        mesh = new THREE.Mesh(cardGeometry, [cardEdge, cardEdge, faceOf(piece.card), cardBack, cardEdge, cardEdge]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        cardMeshes.set(piece, mesh);
        scene.add(mesh);
      }
      mesh.position.copy(position);
      mesh.quaternion.copy(rotation);
    }
    for (const [piece, mesh] of cardMeshes) {
      if (seen.has(piece)) continue;
      scene.remove(mesh);
      cardMeshes.delete(piece);
    }
    for (const rider of physics.riders) place(rider.kind, rider.distance, physics.trackYaw, rider.roll);
    if (physics.held) place(physics.held, 0, physics.trackYaw, 0);
    for (const kind of COIN_KINDS) {
      coins[kind].count = counts[kind];
      coins[kind].instanceMatrix.needsUpdate = true;
      if (coins[kind].instanceColor) coins[kind].instanceColor.needsUpdate = true;
    }

    shelf.position.z = physics.shelfFront;
    track.rotation.y = physics.trackYaw;
    ringArm.rotation.y = physics.ringYaw;
    ringGlow.emissiveIntensity = 2.2 + Math.sin(now / 160) * 0.5 + pulse * 4;
    // The track will have swung on by the time a coin let go now reaches the jump, so the marker shows where it will point then.
    const yawThen = trackYawAt(physics.time + RIDE_TIME);
    aim.visible = physics.held !== undefined;
    aim.position.set(Math.sin(yawThen) * aimForward, AIM_HEIGHT, TRACK.pivotZ + Math.cos(yawThen) * aimForward);

    flare.intensity = pulse * 60;
    glowCoral.emissiveIntensity = 1.6 + pulse * 5;
    glowMoon.emissiveIntensity = 1.1 + pulse * 2.5;

    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i]! <= 0) continue;
      sparkLife[i] = sparkLife[i]! - dt;
      sparkVelocity[i * 3 + 1] = sparkVelocity[i * 3 + 1]! - 22 * dt;
      for (let axis = 0; axis < 3; axis++) sparkPositions[i * 3 + axis] = sparkPositions[i * 3 + axis]! + sparkVelocity[i * 3 + axis]! * dt;
      if (sparkLife[i]! <= 0) sparkPositions[i * 3 + 1] = -999;
    }
    sparkGeometry.attributes.position!.needsUpdate = true;

    renderer.render(scene, camera);
  };

  const sparkle: Scene['sparkle'] = (x, colour, count) => {
    const tint = new THREE.Color(colour);
    for (let n = 0; n < count; n++) {
      const i = nextSpark;
      nextSpark = (nextSpark + 1) % SPARKS;
      sparkPositions.set([x + (Math.random() - 0.5) * 0.8, -0.2, BED_FRONT + 0.5], i * 3);
      sparkVelocity.set([(Math.random() - 0.5) * 6, 7 + Math.random() * 7, (Math.random() - 0.3) * 3], i * 3);
      sparkColours.set([tint.r, tint.g, tint.b], i * 3);
      sparkLife[i] = 0.6 + Math.random() * 0.5;
    }
    sparkGeometry.attributes.color!.needsUpdate = true;
  };

  let viewWidth = 1;
  let viewHeight = 1;
  const resize: Scene['resize'] = (width, height) => {
    viewWidth = width;
    viewHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // The cabinet is taller than it is wide: fit its width on a phone, and on anything wider fit its height instead.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(HALF_VIEW_ACROSS) / Math.min(camera.aspect, PHONE_ASPECT)));
    camera.position.set(0, 15.5, 24.6);
    camera.lookAt(0, 3.7, 4.6);
    camera.updateProjectionMatrix();
  };

  const chuteOnScreen: Scene['chuteOnScreen'] = (x) => {
    const p = new THREE.Vector3(x, 0.4, BED_FRONT + 0.4).project(camera);
    return { x: (p.x * 0.5 + 0.5) * viewWidth, y: (-p.y * 0.5 + 0.5) * viewHeight };
  };

  const dispose = () => {
    pmrem.dispose();
    renderer.dispose();
  };

  return { draw, resize, sparkle, chuteOnScreen, dispose };
};
