'use dom';

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import { cardFace } from './art';
import { CARD_NAMES, CARD_RARITY, type CoinKind, COINS, type Power, POWERS, RARITIES, RING_BONUS, type Serving, SET_BONUS, WIN_HALF_W } from './cabinet';
import { advance, createPhysics, type Physics, rain, release, STEP, surge } from './physics';
import { createScene, type Scene } from './scene';
import { boom, chime, clink, fanfare, release as releaseSound, swoosh, wakeSound } from './sound';

export type Haptic = 'drop' | 'fall' | 'card' | 'ring';

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
/** Coins' worth that must fall to bring the tide in. */
const TIDE_FULL = 90;
/** A run this long is a cascade: time slows for a moment so it can be watched. */
const CASCADE = 8;
const SLOW_RATE = 0.35;
const SLOW_SECONDS = 0.9;

const COIN_COLOURS = { small: 0xdfe3ee, medium: 0xf2c14e, large: 0xff8f6b, giant: 0xffd27a } as const;

const NEXT_SIZE: Record<CoinKind, number> = { small: 12, medium: 16, large: 21, giant: 28 };
const NEXT_FILL: Record<CoinKind, string> = {
  small: 'radial-gradient(circle at 35% 30%, #ffffff, #cfd4e2 55%, #7d8499)',
  medium: 'radial-gradient(circle at 35% 30%, #fff3c4, #f2c14e 55%, #a9792a)',
  large: 'radial-gradient(circle at 35% 30%, #ffd9c9, #ff8f6b 55%, #a8482c)',
  giant: 'radial-gradient(circle at 35% 30%, #fffbe0, #ffd27a 50%, #c98a1e)',
};
const POWER_FILL: Record<Power, string> = {
  burst: 'radial-gradient(circle at 35% 30%, #ffe1a6, #ff5a36 55%, #8a1c0c)',
  split: 'radial-gradient(circle at 35% 30%, #f1d9ff, #b05cff 55%, #4a1a86)',
  chip: 'radial-gradient(circle at 35% 30%, #d9fffb, #2fd6c6 55%, #0b6e68)',
};
const POWER_NAMES: Record<Power, string> = { burst: 'BURST', split: 'SPLIT', chip: 'CHIP' };

type Popup = { id: number; x: number; y: number; text: string; big: boolean; lost?: boolean };

type Hud = {
  coins: number;
  multiplier: number;
  /** 0 to 1: how close the tide is to coming in. */
  tide: number;
  collected: boolean[];
  toast: string | undefined;
  /** The card just won, shown for a moment, and what was said about it. */
  reveal: { card: number; note: string } | undefined;
  /** Counts the bright flashes, so each one restarts the animation. */
  flash: number;
  popups: Popup[];
  held: Serving | undefined;
  next: Serving[];
  ready: boolean;
};

const multiplierFor = (run: number) => Math.min(MAX_MULTIPLIER, 1 + Math.floor(run / COINS_PER_MULTIPLIER));

export default function TidewheelDom({ onHaptic }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const press = useRef<() => void>(() => {});
  const letGo = useRef<() => void>(() => {});
  const [hud, setHud] = useState<Hud>({
    coins: START_COINS,
    multiplier: 1,
    tide: 0,
    collected: CARD_NAMES.map(() => false),
    toast: undefined,
    reveal: undefined,
    flash: 0,
    popups: [],
    held: undefined,
    next: [],
    ready: false,
  });
  // The same pictures the cards in the cabinet wear, for the collection row.
  const faces = useMemo(() => CARD_NAMES.map((_, card) => (cardFace(card).image as HTMLCanvasElement).toDataURL('image/jpeg', 0.8)), []);

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
    let tide = 0;
    let popupId = 0;
    let toastUntil = 0;
    let revealUntil = 0;
    let flash = 0;
    let slowUntil = 0;
    let setPaid = false;
    const collected = CARD_NAMES.map(() => false);
    const buzz = (kind: Haptic) => void onHaptic?.(kind);

    const fit = () => scene?.resize(window.innerWidth, window.innerHeight);

    const frame = (now: number) => {
      if (stopped || !physics || !scene) return;
      raf = requestAnimationFrame(frame);
      owed += last === undefined ? 0 : ((now - last) / 1000 / STEP) * (now < slowUntil ? SLOW_RATE : 1);
      last = now;
      const steps = Math.min(MAX_STEPS_PER_FRAME, Math.floor(owed));
      owed = steps === MAX_STEPS_PER_FRAME ? 0 : owed - steps;

      const popups: Popup[] = [];
      let toast: string | undefined;
      let reveal: Hud['reveal'];
      const bigMoment = (shake: number) => {
        scene!.shake(shake);
        flash++;
        changed = true;
      };
      let changed = false;
      const say = (words: string, seconds: number) => {
        toast = words;
        toastUntil = physics!.time + seconds;
        changed = true;
      };

      for (let n = 0; n < steps; n++) {
        const happened = advance(physics);
        if (happened.clinked) clink();
        if (happened.launched) changed = true;
        if (happened.ringed) {
          say(`Through the ring  ×${RING_BONUS}`, 1.4);
          scene.sparkle(happened.ringed, 0xff8f6b, 24);
          pulse = Math.min(1, pulse + 0.6);
          swoosh();
          buzz('ring');
        }
        if (happened.burst) {
          scene.sparkle(happened.burst, 0xffb347, 90);
          scene.shockwave(happened.burst, 0xff7a3d);
          bigMoment(0.9);
          pulse = 1;
          boom();
          buzz('card');
        }
        if (happened.slam) {
          scene.sparkle(happened.slam, 0xffd27a, 50);
          scene.shockwave(happened.slam, 0xffe2a0);
          bigMoment(1);
          pulse = Math.min(1, pulse + 0.7);
          boom();
          buzz('card');
        }
        if (happened.split) {
          scene.sparkle(happened.split, 0xc77dff, 40);
          pulse = Math.min(1, pulse + 0.4);
          swoosh();
          buzz('ring');
        }
        for (const fall of happened.falls) {
          changed = true;
          const at = scene.chuteOnScreen(fall.x);
          if (fall.piece.type === 'card') {
            const card = fall.piece.card;
            const rarity = CARD_RARITY[card]!;
            const again = collected[card];
            if (again) coins += RARITIES[rarity].duplicate;
            collected[card] = true;
            let note = again ? `Duplicate  +${RARITIES[rarity].duplicate}` : rarity === 'common' ? 'New card' : `New ${rarity} card`;
            if (!setPaid && collected.every(Boolean)) {
              setPaid = true;
              coins += SET_BONUS;
              note = `Set complete  +${SET_BONUS}`;
            }
            reveal = { card, note };
            revealUntil = physics.time + 1.9;
            if (rarity !== 'common') bigMoment(0.4);
            pulse = 1;
            scene.sparkle(scene.chute(fall.x), 0xfff1c9, 60);
            fanfare();
            buzz('card');
            continue;
          }
          if (fall.piece.power === 'chip') {
            rain(physics, POWERS.rain);
            say('Coin shower', 2);
            bigMoment(0.5);
            pulse = 1;
            scene.sparkle(scene.chute(fall.x), 0x2fd6c6, 60);
            fanfare();
            buzz('card');
            continue;
          }
          if (Math.abs(fall.x) > WIN_HALF_W) {
            popups.push({ id: popupId++, x: at.x, y: at.y, text: 'lost', big: false, lost: true });
            continue;
          }
          run = physics.time - lastFall > RUN_GAP ? 1 : run + 1;
          lastFall = physics.time;
          if (run === CASCADE) {
            say('Cascade', 1.4);
            slowUntil = now + SLOW_SECONDS * 1000;
            bigMoment(0.5);
          }
          const gain = COINS[fall.piece.kind].value * multiplierFor(run) * (fall.piece.charged ? RING_BONUS : 1);
          coins += gain;
          tide += gain;
          const big = fall.piece.kind === 'large' || fall.piece.kind === 'giant' || fall.piece.charged;
          popups.push({ id: popupId++, x: at.x, y: at.y, text: `+${gain}`, big });
          scene.sparkle(scene.chute(fall.x), COIN_COLOURS[fall.piece.kind], big ? 26 : 9);
          pulse = Math.min(1, pulse + (big ? 0.5 : 0.16));
          chime(run - 1, big);
          buzz('fall');
        }
        if (tide >= TIDE_FULL) {
          tide = 0;
          surge(physics);
          say('The tide is in', 2.2);
          bigMoment(0.4);
          pulse = 1;
          fanfare();
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
          say(`${REFILL} coins on the house`, 2);
        }
        if (toastUntil > 0 && physics.time > toastUntil) {
          toastUntil = 0;
          changed = true;
        }
        if (revealUntil > 0 && physics.time > revealUntil) {
          revealUntil = 0;
          changed = true;
        }
      }
      pulse = Math.max(0, pulse - steps * STEP * 1.4);
      scene.draw(physics, pulse);

      if (!changed) return;
      const made = physics;
      setHud((old) => ({
        coins,
        multiplier: multiplierFor(run),
        tide: tide / TIDE_FULL,
        collected: [...collected],
        toast: toast ?? (toastUntil === 0 ? undefined : old.toast),
        reveal: reveal ?? (revealUntil === 0 ? undefined : old.reveal),
        flash,
        popups: [...old.popups.slice(-14), ...popups],
        held: made.held,
        next: [...made.queue],
        ready: true,
      }));
    };

    // Holding steadies the aim: the track and the ring swing slowly until the finger lifts, and lifting it lets the coin go.
    press.current = () => {
      wakeSound();
      if (physics) physics.steady = true;
    };
    letGo.current = () => {
      if (physics) physics.steady = false;
      if (!physics || coins <= 0) return;
      if (release(physics) === undefined) return;
      coins--;
      releaseSound();
      buzz('drop');
      const made = physics;
      setHud((old) => ({ ...old, coins, held: undefined, next: [...made.queue] }));
    };

    void createPhysics().then((made) => {
      if (stopped || !canvas.current) return;
      physics = made;
      scene = createScene(canvas.current);
      fit();
      setHud((old) => ({ ...old, held: made.held, next: [...made.queue], ready: true }));
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

  const upNext = hud.held ? [hud.held, ...hud.next] : hud.next;
  const power = hud.held?.power;

  return (
    <div style={styles.screen} onPointerDown={() => press.current()} onPointerUp={() => letGo.current()} onPointerCancel={() => letGo.current()}>
      <style>{KEYFRAMES}</style>
      <canvas ref={canvas} style={styles.canvas} />
      <div style={styles.top}>
        <div style={styles.bank}>
          <span style={styles.coinDot} />
          <span style={styles.count}>{hud.coins}</span>
          {hud.multiplier > 1 && <span style={styles.multiplier}>×{hud.multiplier}</span>}
        </div>
        <div style={styles.tide}>
          <div style={{ ...styles.tideFill, width: `${Math.min(1, hud.tide) * 100}%` }} />
          <span style={styles.tideLabel}>TIDE</span>
        </div>
        <div style={styles.next}>
          <span style={styles.nextLabel}>NEXT</span>
          {upNext.map((serving, n) => (
            <span
              key={n}
              style={{
                ...styles.nextCoin,
                width: NEXT_SIZE[serving.kind] * (n === 0 ? 1.25 : 1),
                height: NEXT_SIZE[serving.kind] * (n === 0 ? 1.25 : 1),
                background: serving.power ? POWER_FILL[serving.power] : NEXT_FILL[serving.kind],
                opacity: n === 0 ? 1 : 0.7,
              }}
            />
          ))}
          {power && <span style={styles.power}>{POWER_NAMES[power]}</span>}
        </div>
      </div>
      {hud.popups.map((popup) => (
        <div
          key={popup.id}
          style={{ ...styles.popup, left: popup.x, top: popup.y, fontSize: popup.lost ? 13 : popup.big ? 34 : 22, color: popup.lost ? 'rgba(239, 231, 214, 0.5)' : popup.big ? '#ff8f6b' : '#fff1c9' }}
        >
          {popup.text}
        </div>
      ))}
      {hud.toast && (
        <div key={hud.toast} style={styles.toast}>
          {hud.toast}
        </div>
      )}
      {hud.flash > 0 && <div key={`flash${hud.flash}`} style={styles.flash} />}
      {hud.reveal !== undefined && (
        <div key={`reveal${hud.reveal.card}${hud.reveal.note}`} style={styles.reveal}>
          <img src={faces[hud.reveal.card]} alt="" style={{ ...styles.revealCard, borderColor: RARITIES[CARD_RARITY[hud.reveal.card]!].colour }} />
          <div style={styles.revealName}>{CARD_NAMES[hud.reveal.card]}</div>
          <div style={{ ...styles.revealNote, color: RARITIES[CARD_RARITY[hud.reveal.card]!].colour }}>{hud.reveal.note}</div>
        </div>
      )}
      <div style={styles.cards}>
        {CARD_NAMES.map((name, card) => (
          <img
            key={name}
            src={faces[card]}
            alt={name}
            style={{ ...styles.card, ...(hud.collected[card] ? { ...styles.cardWon, borderColor: RARITIES[CARD_RARITY[card]!].colour } : null) }}
          />
        ))}
      </div>
      {!hud.ready && <div style={styles.loading}>Filling the cabinet…</div>}
    </div>
  );
}

const KEYFRAMES = `
@keyframes tw-rise { from { opacity: 1; transform: translate(-50%, -50%) scale(0.6); } 20% { transform: translate(-50%, -90%) scale(1.15); } to { opacity: 0; transform: translate(-50%, -260%) scale(1); } }
@keyframes tw-toast { from { opacity: 0; transform: translate(-50%, -8px) scale(0.9); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.05); } 85% { opacity: 1; } to { opacity: 0; transform: translate(-50%, -6px); } }
@keyframes tw-flash { from { opacity: 0.5; } to { opacity: 0; } }
@keyframes tw-reveal { from { opacity: 0; transform: translateX(60px) scale(0.4) rotate(12deg); } 16% { opacity: 1; transform: translateX(0) scale(1.08) rotate(-3deg); } 26% { transform: scale(1) rotate(0deg); } 80% { opacity: 1; transform: scale(1); } to { opacity: 0; transform: translateY(40px) scale(0.5); } }
html, body, #root { margin: 0; height: 100%; background: #05071a; overscroll-behavior: none; }
`;

const FONT = '-apple-system, "Helvetica Neue", "Segoe UI", Roboto, sans-serif';

const styles: Record<string, CSSProperties> = {
  screen: { position: 'fixed', inset: 0, background: '#05071a', overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', fontFamily: FONT },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },
  top: { position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' },
  bank: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(8, 11, 34, 0.72)', border: '1px solid rgba(201, 161, 90, 0.5)' },
  coinDot: { width: 16, height: 16, borderRadius: 8, background: NEXT_FILL.medium },
  count: { color: '#fff6dc', fontSize: 24, fontWeight: 500, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'center' },
  multiplier: { color: '#ff6b5a', fontSize: 20, fontWeight: 700 },
  tide: { position: 'relative', width: 150, height: 14, borderRadius: 7, background: 'rgba(8, 11, 34, 0.72)', border: '1px solid rgba(143, 164, 255, 0.45)', overflow: 'hidden' },
  tideFill: { position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(90deg, #4f6bff, #2fd6c6)', transition: 'width 0.25s ease-out' },
  tideLabel: { position: 'absolute', inset: 0, textAlign: 'center', color: '#efe7d6', fontSize: 9, lineHeight: '13px', letterSpacing: 3 },
  next: { display: 'flex', alignItems: 'center', gap: 6, height: 28 },
  nextLabel: { color: 'rgba(239, 231, 214, 0.55)', fontSize: 10, letterSpacing: 2, marginRight: 2 },
  nextCoin: { display: 'inline-block', borderRadius: 999 },
  power: { color: '#ff6b5a', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginLeft: 4 },
  popup: { position: 'absolute', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.7)', pointerEvents: 'none', animation: 'tw-rise 0.9s ease-out forwards' },
  // Announcements sit in a slim band under the counters, clear of the trays and the track's landing spot.
  toast: {
    position: 'absolute',
    left: '50%',
    top: 'calc(max(12px, env(safe-area-inset-top)) + 112px)',
    padding: '5px 16px',
    borderRadius: 999,
    background: 'rgba(8, 11, 34, 0.85)',
    border: '1px solid #ff6b5a',
    color: '#fff6dc',
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    animation: 'tw-toast 2.2s ease-out forwards',
  },
  flash: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 60%, rgba(255, 236, 200, 0.9), rgba(255, 150, 110, 0.25) 60%, rgba(255, 150, 110, 0))', pointerEvents: 'none', animation: 'tw-flash 0.35s ease-out forwards' },
  // A won card shows small in the top corner, over the backboard, never over the trays.
  reveal: { position: 'absolute', right: 10, top: 'calc(max(12px, env(safe-area-inset-top)) + 4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'none', animation: 'tw-reveal 1.9s ease-in-out forwards' },
  revealCard: { width: 74, height: 104, borderRadius: 7, border: '2px solid #fff6dc', boxShadow: '0 0 26px rgba(255, 241, 201, 0.7), 0 6px 16px rgba(0,0,0,0.6)' },
  revealName: { color: '#fff6dc', fontSize: 12, fontWeight: 600, letterSpacing: 1, textShadow: '0 1px 6px rgba(0,0,0,0.9)' },
  revealNote: { fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', textShadow: '0 1px 6px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' },
  cards: { position: 'absolute', bottom: 'max(12px, env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none' },
  card: { width: 33, height: 46, borderRadius: 4, border: '1px solid rgba(239, 231, 214, 0.2)', filter: 'grayscale(1) brightness(0.32)', objectFit: 'cover' },
  cardWon: { filter: 'none', border: '1px solid #fff6dc', boxShadow: '0 0 10px rgba(255, 241, 201, 0.6)' },
  loading: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#efe7d6', letterSpacing: 2, fontSize: 14 },
};
