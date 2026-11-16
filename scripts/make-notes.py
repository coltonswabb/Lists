#!/usr/bin/env python3
"""
Synthesizes the notes played as items are struck done, and the "Amen" for a finished scroll.

    python3 scripts/make-notes.py

Writes assets/sounds/note-0.wav … note-7.wav, amen.wav, and the three sounds of the turn between
day and night: wheel.wav, dawn.wav and dusk.wav (22.05 kHz mono, 16-bit), the same format as the
other sounds. Needs only the standard library.

The notes are a plucked string (Karplus-Strong) walking an eight-note phrase in D Dorian, so a
scroll's items, struck one after another, play a tune. The Amen is a sung open fifth with an
octave above, as in early organum, swelling and fading.

The wheel is a ratchet: wooden clicks that come quickly and then slow to a last, heavier stop, as
the wheel of stars turns and settles. Dawn is three plucked notes climbing a fifth and an octave.
Dusk is one toll of a small bell.
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


def mix_into(out, samples, at, gain=1.0):
    """Adds `samples` into `out` starting at sample `at`, growing `out` if it must."""
    need = at + len(samples) - len(out)
    if need > 0:
        out.extend([0.0] * need)
    for i, value in enumerate(samples):
        out[at + i] += gain * value


def click(pitch, seconds, seed):
    """One tooth of a wooden ratchet: a tick of noise ringing briefly in the wood."""
    rng = random.Random(seed)
    out = []
    for i in range(int(RATE * seconds)):
        t = i / RATE
        knock = rng.uniform(-1, 1) * math.exp(-t / 0.0016)
        ring = math.sin(2 * math.pi * pitch * t) * math.exp(-t / 0.011) + 0.5 * math.sin(2 * math.pi * pitch * 0.53 * t) * math.exp(-t / 0.02)
        out.append(0.7 * knock + ring)
    return out


def wheel(seconds=1.9, teeth=20):
    """A ratchet turning fast, then slowing to a last, heavier stop."""
    out = [0.0] * int(RATE * 0.02)
    rng = random.Random(7)
    at = 0.0
    for tooth in range(teeth):
        last = tooth == teeth - 1
        pitch = (520 if last else 1500) * rng.uniform(0.94, 1.06)
        mix_into(out, click(pitch, 0.12 if last else 0.05, seed=tooth), int(RATE * at), 1.25 if last else rng.uniform(0.55, 0.8))
        # Each gap is a little longer than the one before: the wheel is running down.
        progress = (tooth + 1) / teeth
        at += 0.035 + 0.15 * progress**2.2
    scale = seconds / max(at, 0.001)
    return out if scale >= 1 else out[: int(RATE * seconds)]


def dawn():
    """Three plucked notes climbing: the day getting up."""
    out = []
    for step, note in enumerate(["D4", "A4", "D5"]):
        mix_into(out, pluck(frequency(note), seconds=1.5, brightness=0.62, seed=40 + step), int(RATE * 0.13 * step), 0.9)
    return out


def dusk(seconds=2.6):
    """One toll of a small bell: partials that are not quite a chord, the high ones dying first."""
    base = frequency("D4")
    partials = [(0.5, 0.5, 2.6), (1.0, 1.0, 2.2), (1.19, 0.55, 1.6), (1.5, 0.4, 1.3), (2.0, 0.5, 1.0), (2.51, 0.22, 0.7), (3.01, 0.14, 0.5)]
    out = []
    for i in range(int(RATE * seconds)):
        t = i / RATE
        strike = min(1, t / 0.003)
        out.append(strike * sum(level * math.sin(2 * math.pi * base * ratio * t) * math.exp(-t / decay * 2.4) for ratio, level, decay in partials))
    fade = int(RATE * 0.3)
    for i in range(fade):
        out[-1 - i] *= i / fade
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
    write(OUT / "wheel.wav", wheel(), 0.5)
    write(OUT / "dawn.wav", dawn(), 0.7)
    write(OUT / "dusk.wav", dusk(), 0.65)
    print("wrote", len(PHRASE), "notes, amen.wav, wheel.wav, dawn.wav and dusk.wav to", OUT)


if __name__ == "__main__":
    main()
