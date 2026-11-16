#!/usr/bin/env python3
"""
Turns drawings dropped in assets/incoming/ into art the app can use.

    python3 scripts/import-art.py

For every line drawing (black ink on white; PNG, WebP or JPEG), named as in docs/art-brief.md:
the white is made transparent, the ink kept as alpha so it can be tinted to any paper's ink, the
empty margins trimmed, and the result scaled to at most 900px wide and written to assets/art/.
Then src/art.ts is rewritten to list what exists, so the app picks new drawings up by itself.

Uses macOS's `sips` to read and resize any format, and only the standard library otherwise.
"""
import re
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCOMING = ROOT / "assets" / "incoming"
ART = ROOT / "assets" / "art"
MODULE = ROOT / "src" / "art.ts"
MAX_WIDTH = 900
PAD = 12  # transparent pixels kept around the trimmed drawing
# Lightness at or above PAPER is background; at or below INK is full-strength line. Between, partly
# transparent, which keeps the anti-aliased edges of the pen strokes smooth.
PAPER, INK = 235, 70
LINE_ART = re.compile(r"^(margin-\d+|quill|flourish|divider|empty-shelf)$")


def read_png(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path} is not a PNG"
    pos, chunks = 8, {}
    idat = b""
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos : pos + 8])
        body = data[pos + 8 : pos + 8 + length]
        if kind == b"IDAT":
            idat += body
        else:
            chunks.setdefault(kind, body)
        pos += 12 + length
    width, height, depth, colour, _, _, interlace = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
    assert depth == 8 and interlace == 0, f"{path}: only 8-bit, non-interlaced PNGs are handled"
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[colour]
    raw = zlib.decompress(idat)
    stride = width * channels
    rows, previous = [], bytearray(stride)
    for y in range(height):
        start = y * (stride + 1)
        kind, line = raw[start], bytearray(raw[start + 1 : start + 1 + stride])
        for x in range(stride):
            left = line[x - channels] if x >= channels else 0
            up = previous[x]
            corner = previous[x - channels] if x >= channels else 0
            if kind == 1:
                line[x] = (line[x] + left) & 255
            elif kind == 2:
                line[x] = (line[x] + up) & 255
            elif kind == 3:
                line[x] = (line[x] + (left + up) // 2) & 255
            elif kind == 4:
                p = left + up - corner
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - corner)
                line[x] = (line[x] + (left if pa <= pb and pa <= pc else up if pb <= pc else corner)) & 255
        rows.append(line)
        previous = line
    return width, height, channels, rows


def lightness(row, x, channels):
    if channels in (1, 2):
        return row[x * channels]
    r, g, b = row[x * channels : x * channels + 3]
    return (r * 299 + g * 587 + b * 114) // 1000


def write_png(path, width, height, rows):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def key_line_art(source, target):
    with tempfile.TemporaryDirectory() as scratch:
        png = Path(scratch) / "source.png"
        subprocess.run(["sips", "-s", "format", "png", str(source), "--out", str(png)], check=True, capture_output=True)
        width, height, channels, rows = read_png(png)
    alpha = []
    for row in rows:
        out = bytearray(width)
        for x in range(width):
            value = lightness(row, x, channels)
            out[x] = 0 if value >= PAPER else 255 if value <= INK else round(255 * (PAPER - value) / (PAPER - INK))
        alpha.append(out)
    # Trim to the ink, keeping a little air around it.
    inked_rows = [y for y, row in enumerate(alpha) if any(row)]
    inked_cols = [x for x in range(width) if any(alpha[y][x] for y in inked_rows)]
    top, bottom = max(0, inked_rows[0] - PAD), min(height, inked_rows[-1] + 1 + PAD)
    left, right = max(0, inked_cols[0] - PAD), min(width, inked_cols[-1] + 1 + PAD)
    trimmed = []
    for y in range(top, bottom):
        row = bytearray()
        for x in range(left, right):
            row += bytes((0, 0, 0, alpha[y][x]))
        trimmed.append(row)
    write_png(target, right - left, bottom - top, trimmed)
    if right - left > MAX_WIDTH:
        subprocess.run(["sips", "--resampleWidth", str(MAX_WIDTH), str(target)], check=True, capture_output=True)
    size = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(target)], check=True, capture_output=True, text=True).stdout
    w = int(re.search(r"pixelWidth: (\d+)", size).group(1))
    h = int(re.search(r"pixelHeight: (\d+)", size).group(1))
    return w, h


def write_module(drawings):
    lines = [
        "// Written by scripts/import-art.py from the drawings in assets/art/. Do not edit by hand.",
        "",
        "/** A line drawing: black ink on transparency, tinted to the paper's ink where it is shown. */",
        "export type Drawing = { source: number; width: number; height: number };",
        "",
        "/** Marginal drawings for finished scrolls, in the order of their file names. */",
        "export const marginalia: Drawing[] = [",
    ]
    for name, (w, h) in sorted(drawings.items()):
        if name.startswith("margin-"):
            lines.append(f"  {{ source: require('../assets/art/{name}.png'), width: {w}, height: {h} }},")
    lines.append("];")
    others = {name: size for name, size in drawings.items() if not name.startswith("margin-")}
    lines += ["", "/** Single drawings by name, when they have been made. */", "export const drawings: Partial<Record<string, Drawing>> = {"]
    for name, (w, h) in sorted(others.items()):
        lines.append(f"  '{name}': {{ source: require('../assets/art/{name}.png'), width: {w}, height: {h} }},")
    lines.append("};")
    MODULE.write_text("\n".join(lines) + "\n")


def main():
    ART.mkdir(parents=True, exist_ok=True)
    for source in sorted(INCOMING.iterdir()):
        name = source.stem
        if source.suffix.lower() not in (".png", ".webp", ".jpg", ".jpeg") or not LINE_ART.match(name):
            continue
        w, h = key_line_art(source, ART / f"{name}.png")
        print(f"imported {source.name} -> assets/art/{name}.png ({w}x{h})")
    drawings = {}
    for png in ART.glob("*.png"):
        size = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(png)], check=True, capture_output=True, text=True).stdout
        drawings[png.stem] = (int(re.search(r"pixelWidth: (\d+)", size).group(1)), int(re.search(r"pixelHeight: (\d+)", size).group(1)))
    write_module(drawings)
    print(f"wrote {MODULE.relative_to(ROOT)} ({len(drawings)} drawings)")


if __name__ == "__main__":
    main()
