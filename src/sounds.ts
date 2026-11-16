import { type AudioPlayer, createAudioPlayer } from 'expo-audio';

const sources = {
  /** A row is written. */
  quill: require('../assets/sounds/quill.wav'),
  /** An item is completed. */
  lute: require('../assets/sounds/lute.wav'),
  /** Something is struck out. */
  seal: require('../assets/sounds/seal.wav'),
  /** A scroll unrolls or rolls up. */
  paper: require('../assets/sounds/paper.wav'),
} as const;

export type SoundName = keyof typeof sources;

const players = new Map<SoundName, AudioPlayer>();
let enabled = true;

export const setSoundEnabled = (value: boolean) => {
  enabled = value;
};

/** Sounds are decoration: a failure to play must never interrupt what the user was doing. */
export const play = (name: SoundName) => {
  if (!enabled) return;
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(sources[name]);
      player.volume = 0.6;
      players.set(name, player);
    }
    void player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // Audio is unavailable (for example before the first touch on the web); stay silent.
  }
};
