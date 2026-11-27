/** Textures drawn at start-up on a canvas, so the prototype ships no image files. Web only: it is used inside the DOM component. */
import * as THREE from 'three';

import { CARD_NAMES, type CoinKind } from './cabinet';

const canvasOf = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')!];
};

const crescent = (g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, cut: string) => {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = cut;
  g.beginPath();
  g.arc(x + r * 0.42, y - r * 0.12, r * 0.86, 0, Math.PI * 2);
  g.fill();
};

const star = (g: CanvasRenderingContext2D, x: number, y: number, r: number, points: number) => {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? r * 0.45 : r;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  g.closePath();
  g.fill();
};

/**
 * A coin's face as a height picture: light is raised, dark is sunk. Used as a bump map so the emblem catches the light the way
 * struck metal does, and as a faint tint so it still reads in flat light.
 */
export const coinFace = (kind: CoinKind): THREE.CanvasTexture => {
  const size = 256;
  const [canvas, g] = canvasOf(size, size);
  const mid = size / 2;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, size, size);
  g.strokeStyle = '#f2f2f2';
  g.lineWidth = 12;
  g.beginPath();
  g.arc(mid, mid, mid - 10, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#e0e0e0';
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    g.beginPath();
    g.arc(mid + Math.cos(angle) * (mid - 30), mid + Math.sin(angle) * (mid - 30), 3.5, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#f4f4f4';
  if (kind === 'small') crescent(g, mid, mid, 52, '#f4f4f4', '#8a8a8a');
  else if (kind === 'medium') star(g, mid, mid, 62, 5);
  else {
    star(g, mid, mid, 78, 8);
    crescent(g, mid, mid, 34, '#6a6a6a', '#f4f4f4');
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const CARD_HUES = [48, 196, 210, 150, 28, 222, 330, 268, 4];

/** Each card's emblem, drawn in a 100 by 100 box centred on the origin. */
const EMBLEMS: ((g: CanvasRenderingContext2D) => void)[] = [
  (g) => crescent(g, 0, 0, 38, '#fff6dc', 'rgba(0,0,0,0)'),
  (g) => {
    for (let row = -1; row <= 1; row++) {
      g.beginPath();
      for (let x = -42; x <= 42; x += 2) g.lineTo(x, row * 22 + Math.sin(x / 9 + row) * 8);
      g.stroke();
    }
  },
  (g) => {
    g.beginPath();
    g.moveTo(-40, 10);
    g.quadraticCurveTo(-12, -34, 0, 4);
    g.quadraticCurveTo(12, -34, 40, 10);
    g.stroke();
    g.beginPath();
    g.moveTo(0, 4);
    g.lineTo(0, 40);
    g.stroke();
  },
  (g) => {
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(i * 22, 42);
      g.bezierCurveTo(i * 22 - 18, 10, i * 22 + 18, -10, i * 22, -42);
      g.stroke();
    }
  },
  (g) => {
    g.strokeRect(-20, -26, 40, 52);
    g.beginPath();
    g.arc(0, 2, 10, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-10, -26);
    g.lineTo(0, -42);
    g.lineTo(10, -26);
    g.stroke();
  },
  (g) => {
    g.beginPath();
    g.moveTo(0, -40);
    g.lineTo(0, 36);
    g.moveTo(-18, -22);
    g.lineTo(18, -22);
    g.stroke();
    g.beginPath();
    g.arc(0, 8, 30, 0.15, Math.PI - 0.15);
    g.stroke();
  },
  (g) => {
    g.beginPath();
    for (let t = 0; t < 14; t += 0.1) g.lineTo(Math.cos(t) * t * 3, Math.sin(t) * t * 3);
    g.stroke();
  },
  (g) => {
    star(g, 16, -16, 18, 5);
    g.beginPath();
    g.moveTo(6, -6);
    g.lineTo(-40, 40);
    g.moveTo(14, 2);
    g.lineTo(-22, 42);
    g.stroke();
  },
  (g) => {
    g.beginPath();
    g.moveTo(-42, 20);
    g.bezierCurveTo(-20, -50, 0, 50, 20, -10);
    g.bezierCurveTo(28, -34, 44, -30, 40, -12);
    g.stroke();
    g.beginPath();
    g.arc(36, -20, 4, 0, Math.PI * 2);
    g.fill();
  },
];

export const cardColour = (card: number): string => `hsl(${CARD_HUES[card % CARD_HUES.length]}, 70%, 62%)`;

/** The face of one card in the set. */
export const cardFace = (card: number): THREE.CanvasTexture => {
  const [canvas, g] = canvasOf(300, 420);
  const hue = CARD_HUES[card % CARD_HUES.length]!;
  const wash = g.createLinearGradient(0, 0, 300, 420);
  wash.addColorStop(0, `hsl(${hue}, 60%, 22%)`);
  wash.addColorStop(1, `hsl(${(hue + 40) % 360}, 70%, 9%)`);
  g.fillStyle = '#f3ead8';
  g.fillRect(0, 0, 300, 420);
  g.fillStyle = wash;
  g.fillRect(14, 14, 272, 392);
  g.strokeStyle = `hsl(${hue}, 80%, 70%)`;
  g.lineWidth = 3;
  g.strokeRect(24, 24, 252, 372);
  g.save();
  g.translate(150, 178);
  g.scale(1.9, 1.9);
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.fillStyle = '#fff6dc';
  g.strokeStyle = '#fff6dc';
  EMBLEMS[card % EMBLEMS.length]!(g);
  g.restore();
  g.fillStyle = '#fff6dc';
  g.font = '600 30px Georgia, serif';
  g.textAlign = 'center';
  g.fillText(CARD_NAMES[card % CARD_NAMES.length]!.toUpperCase(), 150, 362);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

/** The backboard's artwork: a night sky with the phases of the moon ringed round where the wheel hangs. */
export const boardArt = (width: number, height: number, wheelAt: number, wheelRadius: number): THREE.CanvasTexture => {
  const scale = 96;
  const [canvas, g] = canvasOf(width * scale, height * scale);
  const sky = g.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#0a0f2e');
  sky.addColorStop(0.6, '#141b4d');
  sky.addColorStop(1, '#24215c');
  g.fillStyle = sky;
  g.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 5;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255, 244, 220, ${0.15 + random() * 0.6})`;
    g.beginPath();
    g.arc(random() * canvas.width, random() * canvas.height, 0.6 + random() * 1.8, 0, Math.PI * 2);
    g.fill();
  }
  const cx = canvas.width / 2;
  // The texture's top is the top of the board, so distance up the board runs the other way.
  const cy = canvas.height - wheelAt * scale;
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, wheelRadius * scale * 2.1);
  glow.addColorStop(0, 'rgba(255, 150, 120, 0.34)');
  glow.addColorStop(1, 'rgba(255, 150, 120, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(angle) * wheelRadius * scale * 1.62;
    const y = cy + Math.sin(angle) * wheelRadius * scale * 1.62;
    g.fillStyle = '#efe7d6';
    g.beginPath();
    g.arc(x, y, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#141b4d';
    g.beginPath();
    g.arc(x + Math.cos((i / 12) * Math.PI * 2) * 15, y, 15, 0, Math.PI * 2);
    g.fill();
  }
  // Faint lanes running down to the tray, so the eye can follow where a coin will go.
  g.strokeStyle = 'rgba(239, 231, 214, 0.07)';
  g.lineWidth = 3;
  for (let lane = 1; lane < 10; lane++) {
    g.beginPath();
    g.moveTo(lane * scale, cy + wheelRadius * scale * 2.2);
    g.lineTo(lane * scale, canvas.height);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};
