/** The cabinet's sounds, made on the spot with Web Audio so the prototype ships no audio files. Web only. */

let context: AudioContext | undefined;

/** Browsers only allow sound after a touch, so this is called from the first tap. */
export const wakeSound = () => {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
};

const tone = (frequency: number, length: number, volume: number, type: OscillatorType, delay = 0) => {
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + length);
};

/** A pentatonic run, so however many coins fall in a row the notes still sound like they belong together. */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

/** A coin striking metal. */
export const clink = () => {
  tone(2400 + Math.random() * 900, 0.07, 0.05, 'triangle');
  tone(5200 + Math.random() * 1200, 0.04, 0.025, 'sine');
};

/** A coin going down the chute. `step` is how far into a run of falls this one is: each rings higher than the last. */
export const chime = (step: number, big: boolean) => {
  const note = SCALE[Math.min(step, SCALE.length - 1)]!;
  tone(note, big ? 0.5 : 0.3, big ? 0.14 : 0.09, 'sine');
  tone(note * 2, 0.18, 0.04, 'triangle');
};

/** A card won. */
export const fanfare = () => {
  [0, 2, 4, 7].forEach((degree, n) => tone(SCALE[degree]!, 0.5, 0.12, 'triangle', n * 0.09));
};

export const release = () => tone(320, 0.08, 0.06, 'square');

/** A coin threading the ring. */
export const swoosh = () => {
  [5, 7, 9].forEach((degree, n) => tone(SCALE[degree]!, 0.22, 0.1, 'sine', n * 0.05));
};
