#!/usr/bin/env python3
"""
Draws the app icon in each paper's colours: a scroll with its rolls, rods and knobs, and a few
lines of writing, on that paper's desk. The palettes are read from src/theme.ts, so the icons always
match the themes.

    python3 scripts/draw-icons.py

Writes assets/icons/<theme>.png (1024px, opaque, for iOS) and assets/icons/<theme>-foreground.png
(transparent, scaled into the adaptive-icon safe zone, for Android). Needs only the standard library.
"""
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIZE = 1024
SCALE = 2  # drawn at twice the size, then averaged down, for smooth edges


def read_themes():
    source = (ROOT / "src" / "theme.ts").read_text()
    block = source[source.index("export const themes = {") :]
    themes = {}
    for name, body in re.findall(r"\n  (\w+): \{(.*?)\n  \}", block, re.S):
        colours = dict(re.findall(r"(\w+): '(#[0-9a-fA-F]{6})'", body))
        if {"desk", "paperFrom", "paperTo", "ink", "accent", "rod"} <= colours.keys():
            themes[name] = colours
    return themes


def rgb(hex_colour):
    value = int(hex_colour[1:], 16)
    return ((value >> 16) & 255, (value >> 8) & 255, value & 255)


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


class Canvas:
    def __init__(self, size, background):
        self.size = size
        self.pixels = [list(background) for _ in range(size * size)]

    def blend(self, x, y, colour, alpha=1.0):
        if 0 <= x < self.size and 0 <= y < self.size:
            pixel = self.pixels[y * self.size + x]
            if len(pixel) == 4 and pixel[3] == 0:
                # Nothing beneath yet: take the colour as it is, at this opacity.
                pixel[:] = [*colour, round(255 * alpha)]
                return
            for i in range(3):
                pixel[i] = round(pixel[i] + (colour[i] - pixel[i]) * alpha)
            if len(pixel) == 4:
                pixel[3] = round(pixel[3] + (255 - pixel[3]) * alpha)

    def rect(self, x0, y0, x1, y1, colour, radius=0, alpha=1.0, gradient_to=None):
        for y in range(int(y0), int(y1)):
            row = colour if gradient_to is None else mix(colour, gradient_to, (y - y0) / max(1, y1 - y0 - 1))
            for x in range(int(x0), int(x1)):
                if radius:
                    cx = min(max(x + 0.5, x0 + radius), x1 - radius)
                    cy = min(max(y + 0.5, y0 + radius), y1 - radius)
                    if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > radius**2:
                        continue
                self.blend(x, y, row, alpha)

    def circle(self, cx, cy, r, colour):
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self.blend(x, y, colour)


def draw_scroll(canvas, theme, scale, offset):
    """The scroll, in 1024-unit coordinates, placed at `scale` and `offset` on the canvas."""
    desk, paper_from, paper_to = rgb(theme["desk"]), rgb(theme["paperFrom"]), rgb(theme["paperTo"])
    ink, accent, rod = rgb(theme["ink"]), rgb(theme["accent"]), rgb(theme["rod"])
    white = (255, 255, 255)

    def at(v):
        return offset + v * scale

    def rect(x0, y0, x1, y1, colour, radius=0, **kw):
        canvas.rect(at(x0), at(y0), at(x1), at(y1), colour, radius * scale, **kw)

    # The sheet, shading from the top tone to the bottom one, with its margin rule.
    rect(262, 282, 762, 742, paper_from, gradient_to=paper_to)
    rect(350, 282, 355, 742, accent, alpha=0.45)
    # Lines of writing, each with its red mark in the margin; the last is faded, as if half-dry.
    for i, (y, end) in enumerate([(356, 672), (450, 592), (544, 642)]):
        rect(300, y, 336, y + 22, accent, 3, alpha=1.0 - i * 0.18)
        rect(372, y, end, y + 22, ink, 11)
    rect(372, 638, 552, 660, ink, 11, alpha=0.4)
    # The rolls at either end: three bands of tone for the curve, then the rods and their knobs.
    for top, paper in ((190, paper_from), (742, paper_to)):
        rect(226, top, 798, top + 92, mix(paper, desk, 0.28), 16)
        rect(226, top, 798, top + 68, paper, 16)
        rect(226, top + 16, 798, top + 68, paper)
        rect(226, top, 798, top + 26, mix(paper, white, 0.22), 16)
        rect(226, top + 16, 798, top + 26, mix(paper, white, 0.22))
        for x in (204, 800):
            rect(x, top - 10, x + 20, top + 102, rod, 2)
        for cx in (179, 845):
            canvas.circle(at(cx), at(top + 46), 23 * scale, accent)


def downsample(canvas, factor):
    size = canvas.size // factor
    channels = len(canvas.pixels[0])
    out = bytearray()
    for y in range(size):
        out.append(0)  # PNG filter type: none
        for x in range(size):
            total = [0] * channels
            for dy in range(factor):
                for dx in range(factor):
                    pixel = canvas.pixels[(y * factor + dy) * canvas.size + x * factor + dx]
                    # Colour is weighted by opacity, so transparent pixels add no dark fringe.
                    weight = pixel[3] if channels == 4 else 1
                    for i in range(3):
                        total[i] += pixel[i] * weight
                    if channels == 4:
                        total[3] += pixel[3]
            weights = total[3] if channels == 4 else factor**2
            colour = [round(t / weights) if weights else 0 for t in total[:3]]
            out.extend(colour + ([round(total[3] / factor**2)] if channels == 4 else []))
    return size, channels, bytes(out)


def write_png(path, size, channels, data):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    colour_type = 6 if channels == 4 else 2
    header = struct.pack(">IIBBBBB", size, size, 8, colour_type, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(data, 9)) + chunk(b"IEND", b""))


def main():
    out = ROOT / "assets" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    big = SIZE * SCALE
    for name, theme in read_themes().items():
        icon = Canvas(big, rgb(theme["desk"]))
        draw_scroll(icon, theme, SCALE, 0)
        write_png(out / f"{name}.png", *downsample(icon, SCALE))
        # Android crops adaptive icons to a circle or squircle: keep the scroll within the middle 62%.
        foreground = Canvas(big, (0, 0, 0, 0))
        draw_scroll(foreground, theme, SCALE * 0.62, big * 0.19)
        write_png(out / f"{name}-foreground.png", *downsample(foreground, SCALE))
        print("drew", name)


if __name__ == "__main__":
    main()
