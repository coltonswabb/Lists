#!/usr/bin/env python3
"""
Synthesizes the notes played as items are struck done, and the "Amen" for a finished scroll.

    python3 scripts/make-notes.py

Writes assets/sounds/note-0.wav … note-7.wav and amen.wav (22.05 kHz mono, 16-bit), the same
format as the other sounds. Needs only the standard library.

The notes are a plucked string (Karplus-Strong) walking an eight-note phrase in D Dorian, so a
scroll's items, struck one after another, play a tune. The Amen is a sung open fifth with an
octave above, as in early organum, swelling and fading.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"

# D Dorian: D E F G A B C. The phrase rises, turns, and comes home.
PHRASE = ["D4", "F4", "G4", "A4", "C5", "A4", "G4", "E4"]
SEMITONES = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}


def frequency(note):
    name, octave = note[0], int(note[1:])
    return 440.0 * 2 ** ((SEMITONES[name] + 12 * (octave - 4)) / 12)


def pluck(freq, seconds=1.3, brightness=0.5, seed=1):
    """A plucked string: a burst of noise circulating through a delay line, softening as it decays."""
    rng = random.Random(seed)
    period = max(2, round(RATE / freq))
    line = [rng.uniform(-1, 1) for _ in range(period)]
    out = []
    for i in range(int(RATE * seconds)):
        first = line[i % period]
        second = line[(i + 1) % period]
        # Averaging neighbours damps the high partials first, as on a gut string.
        line[i % period] = 0.996 * (brightness * first + (1 - brightness) * second)
        out.append(first)
    # A short fade-in takes the click off the attack; a fade-out ends it cleanly.
    fade_in, fade_out = int(RATE * 0.004), int(RATE * 0.25)
    for i in range(fade_in):
        out[i] *= i / fade_in
    for i in range(fade_out):
        out[-1 - i] *= i / fade_out
    return out


def voice(freq, seconds, vibrato=0.0):
    """A sung vowel, roughly: a few harmonics shaped like an open 'ah', with a slow vibrato."""
    harmonics = [(1, 1.0), (2, 0.55), (3, 0.42), (4, 0.18), (5, 0.12), (6, 0.05)]
    out = []
    phase = 0.0
    for i in range(int(RATE * seconds)):
        t = i / RATE
        wobble = 1 + vibrato * math.sin(2 * math.pi * 5.2 * t) * min(1, t / 0.6)
        phase += 2 * math.pi * freq * wobble / RATE
        out.append(sum(level * math.sin(k * phase) for k, level in harmonics))
    return out


def amen():
    seconds = 2.4
    chord = [voice(frequency("D3"), seconds, 0.004), voice(frequency("A3"), seconds, 0.005), voice(frequency("D4"), seconds, 0.006)]
    out = []
    for i in range(int(RATE * seconds)):
        t = i / RATE
        swell = min(1, t / 0.35) * min(1, (seconds - t) / 0.9)
        out.append(swell * sum(part[i] for part in chord) / 3)
    return out


def write(path, samples, volume):
    peak = max(abs(s) for s in samples) or 1
    with wave.open(str(path), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(b"".join(struct.pack("<h", round(32767 * volume * s / peak)) for s in samples))


def main():
    for index, note in enumerate(PHRASE):
        write(OUT / f"note-{index}.wav", pluck(frequency(note), seed=index + 1), 0.7)
    write(OUT / "amen.wav", amen(), 0.6)
    print("wrote", len(PHRASE), "notes and amen.wav to", OUT)


if __name__ == "__main__":
    main()
