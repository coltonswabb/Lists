'use dom';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { cardColour } from './art';
import { CARD_NAMES, COINS } from './cabinet';
import { advance, createPhysics, type Physics, release, STEP } from './physics';
import { createScene, type Scene } from './scene';
import { chime, clink, fanfare, release as releaseSound, wakeSound } from './sound';

export type Haptic = 'drop' | 'fall' | 'card';

type Props = {
  /** Asks the phone to buzz. Runs on the native side; absent on the web. */
  onHaptic?: (kind: Haptic) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

const START_COINS = 40;
/** Falls this close together, in seconds, count as one run. */
const RUN_GAP = 1.6;
/** Every this many coins in a run raises what each further coin is worth. */
const COINS_PER_MULTIPLIER = 4;
const MAX_MULTIPLIER = 5;
/** With nothing left to drop, the machine hands over a few more after this many seconds. */
const REFILL_AFTER = 3;
const REFILL = 15;
const MAX_STEPS_PER_FRAME = 3;

const COIN_COLOURS = { small: 0xdfe3ee, medium: 0xf2c14e, large: 0xff8f6b } as const;

type Popup = { id: number; x: number; y: number; text: string; big: boolean };

type Hud = { coins: number; multiplier: number; collected: boolean[]; toast: string | undefined; popups: Popup[]; ready: boolean };

const multiplierFor = (run: number) => Math.min(MAX_MULTIPLIER, 1 + Math.floor(run / COINS_PER_MULTIPLIER));

export default function TidewheelDom({ onHaptic }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tap = useRef<() => void>(() => {});
  const [hud, setHud] = useState<Hud>({ coins: START_COINS, multiplier: 1, collected: CARD_NAMES.map(() => false), toast: undefined, popups: [], ready: false });

  useEffect(() => {
    let physics: Physics | undefined;
    let scene: Scene | undefined;
    let raf = 0;
    let stopped = false;
    let last: number | undefined;
    let owed = 0;
    let coins = START_COINS;
    let run = 0;
    let lastFall = -Infinity;
    let emptySince: number | undefined;
    let pulse = 0;
    let popupId = 0;
    let toastUntil = 0;
    const collected = CARD_NAMES.map(() => false);
    const buzz = (kind: Haptic) => void onHaptic?.(kind);

    const fit = () => scene?.resize(window.innerWidth, window.innerHeight);

    const frame = (now: number) => {
      if (stopped || !physics || !scene) return;
      raf = requestAnimationFrame(frame);
      owed += last === undefined ? 0 : (now - last) / 1000 / STEP;
      last = now;
      const steps = Math.min(MAX_STEPS_PER_FRAME, Math.floor(owed));
      owed = steps === MAX_STEPS_PER_FRAME ? 0 : owed - steps;

      const popups: Popup[] = [];
      let toast: string | undefined;
      let changed = false;
      for (let n = 0; n < steps; n++) {
        const falls = advance(physics);
        if (physics.clinks > 0) clink();
        for (const fall of falls) {
          changed = true;
          const at = scene.chuteOnScreen(fall.x);
          if (fall.piece.type === 'card') {
            collected[fall.piece.card] = true;
            toast = `${CARD_NAMES[fall.piece.card]} card collected`;
            toastUntil = physics.time + 2.6;
            pulse = 1;
            scene.sparkle(fall.x, 0xfff1c9, 60);
            fanfare();
            buzz('card');
            continue;
          }
          run = physics.time - lastFall > RUN_GAP ? 1 : run + 1;
          lastFall = physics.time;
          const gain = COINS[fall.piece.kind].value * multiplierFor(run);
          coins += gain;
          const big = fall.piece.kind === 'large';
          popups.push({ id: popupId++, x: at.x, y: at.y, text: `+${gain}`, big });
          scene.sparkle(fall.x, COIN_COLOURS[fall.piece.kind], big ? 26 : 9);
          pulse = Math.min(1, pulse + (big ? 0.5 : 0.16));
          chime(run - 1, big);
          buzz('fall');
        }
        if (run > 0 && physics.time - lastFall > RUN_GAP) {
          run = 0;
          changed = true;
        }
        if (coins > 0) emptySince = undefined;
        else if (emptySince === undefined) emptySince = physics.time;
        else if (physics.time - emptySince > REFILL_AFTER) {
          coins = REFILL;
          emptySince = undefined;
          toast = `${REFILL} coins on the house`;
          toastUntil = physics.time + 2;
          changed = true;
        }
        if (toastUntil > 0 && physics.time > toastUntil) {
          toastUntil = 0;
          changed = true;
        }
      }
      pulse = Math.max(0, pulse - steps * STEP * 1.4);
      scene.draw(physics, pulse);

      if (!changed) return;
      const clearToast = toastUntil === 0;
      setHud((old) => ({
        coins,
        multiplier: multiplierFor(run),
        collected: [...collected],
        toast: toast ?? (clearToast ? undefined : old.toast),
        popups: [...old.popups.slice(-14), ...popups],
        ready: true,
      }));
    };

    tap.current = () => {
      wakeSound();
      if (!physics || coins <= 0) return;
      if (release(physics) === undefined) return;
      coins--;
      releaseSound();
      buzz('drop');
      setHud((old) => ({ ...old, coins }));
    };

    void createPhysics().then((made) => {
      if (stopped || !canvas.current) return;
      physics = made;
      scene = createScene(canvas.current);
      fit();
      setHud((old) => ({ ...old, ready: true }));
      raf = requestAnimationFrame(frame);
    });
    window.addEventListener('resize', fit);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      scene?.dispose();
    };
  }, [onHaptic]);

  return (
    <div style={styles.screen} onPointerDown={() => tap.current()}>
      <style>{KEYFRAMES}</style>
      <canvas ref={canvas} style={styles.canvas} />
      <div style={styles.top}>
        <div style={styles.title}>TIDEWHEEL</div>
        <div style={styles.bank}>
          <span style={styles.coinDot} />
          <span style={styles.count}>{hud.coins}</span>
          {hud.multiplier > 1 && <span style={styles.multiplier}>×{hud.multiplier}</span>}
        </div>
      </div>
      {hud.popups.map((popup) => (
        <div key={popup.id} style={{ ...styles.popup, left: popup.x, top: popup.y, fontSize: popup.big ? 34 : 22, color: popup.big ? '#ff8f6b' : '#fff1c9' }}>
          {popup.text}
        </div>
      ))}
      {hud.toast && (
        <div key={hud.toast} style={styles.toast}>
          {hud.toast}
        </div>
      )}
      <div style={styles.cards}>
        {CARD_NAMES.map((name, card) => (
          <div key={name} style={{ ...styles.card, ...(hud.collected[card] ? { background: cardColour(card), borderColor: '#fff6dc', color: '#0a0d26' } : null) }}>
            {name.slice(0, 1)}
          </div>
        ))}
      </div>
      {!hud.ready && <div style={styles.loading}>Filling the cabinet…</div>}
    </div>
  );
}

const KEYFRAMES = `
@keyframes tw-rise { from { opacity: 1; transform: translate(-50%, -50%) scale(0.6); } 20% { transform: translate(-50%, -90%) scale(1.15); } to { opacity: 0; transform: translate(-50%, -260%) scale(1); } }
@keyframes tw-toast { from { opacity: 0; transform: translate(-50%, 12px) scale(0.9); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.04); } 85% { opacity: 1; } to { opacity: 0; transform: translate(-50%, -8px); } }
html, body, #root { margin: 0; height: 100%; background: #05071a; overscroll-behavior: none; }
`;

const FONT = '-apple-system, "Helvetica Neue", "Segoe UI", Roboto, sans-serif';

const styles: Record<string, CSSProperties> = {
  screen: { position: 'fixed', inset: 0, background: '#05071a', overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', fontFamily: FONT },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },
  top: { position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' },
  title: { color: '#efe7d6', fontSize: 15, letterSpacing: 7, fontWeight: 300, opacity: 0.8 },
  bank: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(8, 11, 34, 0.72)', border: '1px solid rgba(201, 161, 90, 0.5)' },
  coinDot: { width: 16, height: 16, borderRadius: 8, background: 'radial-gradient(circle at 35% 30%, #fff3c4, #f2c14e 55%, #a9792a)' },
  count: { color: '#fff6dc', fontSize: 24, fontWeight: 500, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'center' },
  multiplier: { color: '#ff6b5a', fontSize: 20, fontWeight: 700 },
  popup: { position: 'absolute', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.7)', pointerEvents: 'none', animation: 'tw-rise 0.9s ease-out forwards' },
  toast: {
    position: 'absolute',
    left: '50%',
    top: '42%',
    padding: '10px 22px',
    borderRadius: 14,
    background: 'rgba(8, 11, 34, 0.82)',
    border: '1px solid #ff6b5a',
    color: '#fff6dc',
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    animation: 'tw-toast 2.4s ease-out forwards',
  },
  cards: { position: 'absolute', bottom: 'max(14px, env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' },
  card: {
    width: 30,
    height: 42,
    borderRadius: 5,
    border: '1px solid rgba(239, 231, 214, 0.28)',
    background: 'rgba(8, 11, 34, 0.6)',
    color: 'rgba(239, 231, 214, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 600,
  },
  loading: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#efe7d6', letterSpacing: 2, fontSize: 14 },
};
