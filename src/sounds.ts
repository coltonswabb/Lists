import { type AudioPlayer, createAudioPlayer } from 'expo-audio';

/** The sounds are synthesized: scripts/make-notes.py writes the notes and the Amen. */
const sources = {
  /** A row is written. */
  quill: require('../assets/sounds/quill.wav'),
  /** Something is struck out. */
  seal: require('../assets/sounds/seal.wav'),
  /** A scroll unrolls or rolls up. */
  paper: require('../assets/sounds/paper.wav'),
  /** The last item on a scroll is struck: an Amen in open fifths. */
  amen: require('../assets/sounds/amen.wav'),
  /** Items struck one after another walk a phrase in D Dorian, one note each. */
  note0: require('../assets/sounds/note-0.wav'),
  note1: require('../assets/sounds/note-1.wav'),
  note2: require('../assets/sounds/note-2.wav'),
  note3: require('../assets/sounds/note-3.wav'),
  note4: require('../assets/sounds/note-4.wav'),
  note5: require('../assets/sounds/note-5.wav'),
  note6: require('../assets/sounds/note-6.wav'),
  note7: require('../assets/sounds/note-7.wav'),
} as const;

export type SoundName = keyof typeof sources;

const notes: SoundName[] = ['note0', 'note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7'];

const players = new Map<SoundName, AudioPlayer>();
let enabled = true;

export const setSoundEnabled = (value: boolean) => {
  enabled = value;
};

/**
 * Plays a sound. `rate` below 1 plays it slower and, with pitch correction off, lower, the way
 * a sampler's punch-in effect bends a sound: rolling a scroll up sounds like winding it down.
 * Sounds are decoration: a failure to play must never interrupt what the user was doing.
 */
export const play = (name: SoundName, rate = 1) => {
  if (!enabled) return;
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(sources[name]);
      player.volume = 0.6;
      player.shouldCorrectPitch = false;
      players.set(name, player);
    }
    player.setPlaybackRate(rate);
    void player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // Audio is unavailable (for example before the first touch on the web); stay silent.
  }
};

/** The note for the item struck `count`-th on its scroll (from 0), walking the phrase and starting again. */
export const playNote = (count: number) => {
  play(notes[((count % notes.length) + notes.length) % notes.length] ?? 'note0');
};
