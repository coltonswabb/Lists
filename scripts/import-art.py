#!/usr/bin/env python3
"""
Turns art dropped in assets/incoming/ into files the app can use, named as in docs/art-brief.md.

    python3 scripts/import-art.py

- Line drawings (black ink on white): the white becomes transparent and the ink its alpha, so the
  app can tint it to any paper's ink; trimmed, and scaled to at most 900px wide.
- wax-seal: the white around the seal is cut away from the edges inward, so the wax's own white
  highlights survive; trimmed and scaled to 192px.
- parchment: a greyscale texture becomes a soft darkening layer (black, with the darker mottling as
  alpha), so it marks every paper colour without greying it. Kept tileable, at full size.
- desk-<paper>: tileable desk textures, kept in colour, 512px.
- finial-<metal>, desk-inkwell, desk-candle: painted objects on white, cut out like the seal.
- deckle-edge: a black-and-white mask of a torn paper edge becomes a narrow strip of "air" (opaque
  where there is no paper), which the app tints as the desk and lays over the sheet's sides.
- sky-sun, sky-moon: painted and cut out; sky-wheel, sky-corner: line art; sky-night, sky-dawn:
  full-bleed paintings kept as JPEGs. Together they are the turn between day and night.
- vigil-stars: a tileable scatter of stars, keyed like line art but left untrimmed.
- icon-<paper>: full-bleed app icons, copied to assets/icons/<paper>.png at 1024px. These replace
  what scripts/draw-icons.py drew, and only show after the next native build.

Everything is written to assets/art/, and src/art.ts is rewritten to list what exists, so the app
picks new art up by itself.

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
SINGLES = ("quill", "flourish", "divider", "empty-shelf", "initial-frame", "tick", "strike", "nil-found", "sky-wheel", "sky-corner")
LINE_ART = re.compile(r"^(margin-\d+|" + "|".join(SINGLES) + r")$")
# Painted objects cut out of a white ground, and the longest side each is scaled to.
OBJECTS = {"wax-seal": 192, "finial-brass": 200, "finial-iron": 200, "desk-inkwell": 480, "desk-candle": 420, "sky-sun": 640, "sky-moon": 560}
# Full-bleed paintings behind the turn of day and night, kept as JPEGs: they have no transparency and are large.
SKIES = ("sky-night", "sky-dawn")
SKY_HEIGHT = 1280
# A tileable scatter of stars: keyed like line art, but never trimmed, or it would no longer tile.
SCATTER, SCATTER_SIZE = "vigil-stars", 512
ICON = re.compile(r"^icon-(scriptorium|vigil|lapis|verdant|codex)$")
ICONS = ROOT / "assets" / "icons"
DECKLE_HEIGHT = 1086
DESK = re.compile(r"^desk-(scriptorium|vigil|lapis|verdant|codex)$")
TILE_SIZE, PARCHMENT_SIZE = 512, 1254
PARCHMENT_STRENGTH = 70  # the alpha of the darkest mottling, out of 255


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


def load(source):
    with tempfile.TemporaryDirectory() as scratch:
        png = Path(scratch) / "source.png"
        subprocess.run(["sips", "-s", "format", "png", str(source), "--out", str(png)], check=True, capture_output=True)
        return read_png(png)


def size_of(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)], check=True, capture_output=True, text=True).stdout
    return int(re.search(r"pixelWidth: (\d+)", out).group(1)), int(re.search(r"pixelHeight: (\d+)", out).group(1))


def trim(width, height, pixels):
    """Crops an RGBA image (rows of bytearrays) to its visible pixels, keeping PAD around them."""
    seen_rows = [y for y in range(height) if any(pixels[y][3::4])]
    seen_cols = [x for x in range(width) if any(pixels[y][x * 4 + 3] for y in seen_rows)]
    top, bottom = max(0, seen_rows[0] - PAD), min(height, seen_rows[-1] + 1 + PAD)
    left, right = max(0, seen_cols[0] - PAD), min(width, seen_cols[-1] + 1 + PAD)
    return right - left, bottom - top, [pixels[y][left * 4 : right * 4] for y in range(top, bottom)]


def rgba(row, x, channels):
    if channels == 1:
        return row[x], row[x], row[x], 255
    if channels == 2:
        return row[x * 2], row[x * 2], row[x * 2], row[x * 2 + 1]
    if channels == 3:
        return row[x * 3], row[x * 3 + 1], row[x * 3 + 2], 255
    return tuple(row[x * 4 : x * 4 + 4])


def key_object(source, target, size):
    """Cuts the white background away from the edges inward, leaving the object and its highlights."""
    width, height, channels, rows = load(source)
    pixels = [bytearray(b"".join(bytes(rgba(row, x, channels)) for x in range(width))) for row in rows]

    def background(x, y):
        r, g, b, _ = pixels[y][x * 4 : x * 4 + 4]
        return min(r, g, b) > 222 and max(r, g, b) - min(r, g, b) < 24

    stack = [(x, y) for x in range(width) for y in (0, height - 1)] + [(x, y) for y in range(height) for x in (0, width - 1)]
    cleared = bytearray(width * height)
    while stack:
        x, y = stack.pop()
        if cleared[y * width + x] or not background(x, y):
            continue
        cleared[y * width + x] = 1
        pixels[y][x * 4 + 3] = 0
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not cleared[ny * width + nx]:
                stack.append((nx, ny))
    # The object's anti-aliased rim is still nearly white; take it off so no pale halo shows on a dark desk.
    for _ in range(2):
        rim = []
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                if cleared[y * width + x]:
                    continue
                if not (cleared[y * width + x - 1] or cleared[y * width + x + 1] or cleared[(y - 1) * width + x] or cleared[(y + 1) * width + x]):
                    continue
                if min(pixels[y][x * 4 : x * 4 + 3]) > 170:
                    rim.append((x, y))
        for x, y in rim:
            cleared[y * width + x] = 1
            pixels[y][x * 4 + 3] = 0
    w, h, cropped = trim(width, height, pixels)
    write_png(target, w, h, cropped)
    subprocess.run(["sips", "-Z", str(size), str(target)], check=True, capture_output=True)


def deckle_strip(source, target):
    """The band of a torn-edge mask where paper gives way to air, as black whose alpha is the air."""
    width, height, channels, rows = load(source)
    air = [[lightness(row, x, channels) for x in range(width)] for row in rows]
    # Per row, where the paper begins (the first dark pixel from the left).
    # A stray fleck of ink out in the air is not the edge: the paper starts where it stays dark.
    run = 12
    starts = [next((x for x in range(width - run) if all(v < 128 for v in line[x : x + run])), width) for line in air]
    left, right = max(0, min(starts) - 2), min(width, max(starts) + 3)
    out = []
    for line, start in zip(air, starts):
        row = bytearray()
        for x in range(left, right):
            # Air up to the edge, whatever flecks lie in it; past the edge, the mask's own soft boundary.
            row += bytes((0, 0, 0, 255 if x < start - 2 else line[x]))
        out.append(row)
    write_png(target, right - left, height, out)
    scaled = max(1, round((right - left) * DECKLE_HEIGHT / height))
    subprocess.run(["sips", "-z", str(DECKLE_HEIGHT), str(scaled), str(target)], check=True, capture_output=True)


def app_icon(source, name):
    ICONS.mkdir(parents=True, exist_ok=True)
    target = ICONS / f"{name}.png"
    subprocess.run(["sips", "-s", "format", "png", "-z", "1024", "1024", str(source), "--out", str(target)], check=True, capture_output=True)
    return target


def parchment_layer(source, target):
    """Black with the texture's darker mottling as alpha: it darkens any paper a little, unevenly."""
    width, height, channels, rows = load(source)
    values = sorted(lightness(rows[y], x, channels) for y in range(0, height, 4) for x in range(0, width, 4))
    dark, light = values[len(values) // 50], values[-len(values) // 50]
    span = max(1, light - dark)
    out = []
    for row in rows:
        line = bytearray()
        for x in range(width):
            depth = min(1.0, max(0.0, (light - lightness(row, x, channels)) / span))
            line += bytes((0, 0, 0, round(PARCHMENT_STRENGTH * depth)))
        out.append(line)
    write_png(target, width, height, out)
    # Large, so that once iOS shows it at its @3x size a tile still spans the sheet and its stains
    # don't visibly repeat.
    subprocess.run(["sips", "-z", str(PARCHMENT_SIZE), str(PARCHMENT_SIZE), str(target)], check=True, capture_output=True)


def desk_tile(source, target):
    subprocess.run(["sips", "-s", "format", "png", "-z", str(TILE_SIZE), str(TILE_SIZE), str(source), "--out", str(target)], check=True, capture_output=True)


def key_line_art(source, target, trimmed=True, max_width=MAX_WIDTH):
    width, height, channels, rows = load(source)
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
    if not trimmed:
        top, bottom, left, right = 0, height, 0, width
    trimmed = []
    for y in range(top, bottom):
        row = bytearray()
        for x in range(left, right):
            row += bytes((0, 0, 0, alpha[y][x]))
        trimmed.append(row)
    write_png(target, right - left, bottom - top, trimmed)
    if right - left > max_width:
        subprocess.run(["sips", "--resampleWidth", str(max_width), str(target)], check=True, capture_output=True)
    size = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(target)], check=True, capture_output=True, text=True).stdout
    w = int(re.search(r"pixelWidth: (\d+)", size).group(1))
    h = int(re.search(r"pixelHeight: (\d+)", size).group(1))
    return w, h


def entry(name, w, h):
    return f"{{ source: require('../assets/art/{name}.png'), width: {w}, height: {h} }}"


def write_module(drawings):
    lines = [
        "// Written by scripts/import-art.py from the art in assets/art/. Do not edit by hand.",
        "",
        "import type { ThemeName } from './theme';",
        "",
        "/** An image and its size in pixels. Line drawings are black on transparency, tinted where shown. */",
        "export type Drawing = { source: number; width: number; height: number };",
        "",
        "/** Marginal drawings for finished scrolls, in the order of their file names. */",
        "export const marginalia: Drawing[] = [",
    ]
    for name, (w, h) in sorted(drawings.items()):
        if name.startswith("margin-"):
            lines.append(f"  {entry(name, w, h)},")
    lines.append("];")
    singles = {n: s for n, s in drawings.items() if LINE_ART.match(n) and not n.startswith("margin-")}
    lines += ["", "/** Single line drawings by name, when they have been made. */", "export const drawings: Partial<Record<" + " | ".join(f"'{n}'" for n in SINGLES) + ", Drawing>> = {"]
    for name, (w, h) in sorted(singles.items()):
        lines.append(f"  '{name}': {entry(name, w, h)},")
    lines.append("};")
    lines += ["", "/** The wax seal pressed on a finished scroll, in its own colours. */"]
    seal = drawings.get("wax-seal")
    lines.append(f"export const waxSeal: Drawing | undefined = {entry('wax-seal', *seal) if seal else 'undefined'};")
    lines += ["", "/** A tileable darkening layer that gives every paper a parchment mottle. */"]
    parchment = drawings.get("parchment")
    lines.append(f"export const parchment: Drawing | undefined = {entry('parchment', *parchment) if parchment else 'undefined'};")
    lines += ["", "/** Tileable desk textures, by paper. A paper without one keeps its plain desk colour. */", "export const desks: Partial<Record<ThemeName, Drawing>> = {"]
    for name, (w, h) in sorted(drawings.items()):
        if DESK.match(name):
            lines.append(f"  {name[5:]}: {entry(name, w, h)},")
    lines.append("};")
    lines += ["", "/** Turned end caps for a scroll's rod, pointing left, in their own colours. */", "export const finials: Partial<Record<'brass' | 'iron', Drawing>> = {"]
    for name, (w, h) in sorted(drawings.items()):
        if name.startswith("finial-"):
            lines.append(f"  {name[7:]}: {entry(name, w, h)},")
    lines.append("};")
    lines += ["", "/** Things lying on the desk, in their own colours. */", "export const deskProps: Partial<Record<'inkwell' | 'candle', Drawing>> = {"]
    for name in ("desk-inkwell", "desk-candle"):
        if name in drawings:
            lines.append(f"  {name[5:]}: {entry(name, *drawings[name])},")
    lines.append("};")
    lines += ["", "/** The sun and the moon, in their own colours, for the turn of day and night. */", "export const celestial: Partial<Record<'sun' | 'moon', Drawing>> = {"]
    for name in ("sky-sun", "sky-moon"):
        if name in drawings:
            lines.append(f"  {name[4:]}: {entry(name, *drawings[name])},")
    lines.append("};")
    lines += ["", "/** Full-bleed skies painted behind the sun and the moon. */", "export const skies: Partial<Record<'night' | 'dawn', Drawing>> = {"]
    for name in SKIES:
        if name in drawings:
            w, h = drawings[name]
            lines.append(f"  {name[4:]}: {{ source: require('../assets/art/{name}.jpg'), width: {w}, height: {h} }},")
    lines.append("};")
    lines += ["", "/** A tileable scatter of stars, black on transparency, strewn in gold over Night Vigil's desk. */"]
    scatter = drawings.get(SCATTER)
    lines.append(f"export const starScatter: Drawing | undefined = {entry(SCATTER, *scatter) if scatter else 'undefined'};")
    lines += ["", "/** A vertical, tileable strip of torn edge: opaque where the paper is missing. Tinted as the desk. */"]
    deckle = drawings.get("deckle-edge")
    lines.append(f"export const deckle: Drawing | undefined = {entry('deckle-edge', *deckle) if deckle else 'undefined'};")
    MODULE.write_text("\n".join(lines) + "\n")


def main():
    ART.mkdir(parents=True, exist_ok=True)
    for source in sorted(INCOMING.iterdir()):
        name = source.stem
        target = ART / f"{name}.png"
        if source.suffix.lower() not in (".png", ".webp", ".jpg", ".jpeg"):
            continue
        if name in SKIES:
            painted = ART / f"{name}.jpg"
            if not painted.exists() or painted.stat().st_mtime < source.stat().st_mtime:
                subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "78", "--resampleHeight", str(SKY_HEIGHT), str(source), "--out", str(painted)], check=True, capture_output=True)
                print(f"imported {source.name} -> assets/art/{name}.jpg")
            continue
        if target.exists() and target.stat().st_mtime > source.stat().st_mtime:
            continue  # already imported, and the source hasn't changed since
        if LINE_ART.match(name):
            key_line_art(source, target)
        elif name == SCATTER:
            key_line_art(source, target, trimmed=False, max_width=SCATTER_SIZE)
        elif ICON.match(name):
            icon = ICONS / f"{name[5:]}.png"
            if not icon.exists() or icon.stat().st_mtime < source.stat().st_mtime:
                app_icon(source, name[5:])
                print(f"imported {source.name} -> assets/icons/{name[5:]}.png")
            continue
        elif name in OBJECTS:
            key_object(source, target, OBJECTS[name])
        elif name == "deckle-edge":
            deckle_strip(source, target)
        elif name == "parchment":
            parchment_layer(source, target)
        elif DESK.match(name):
            desk_tile(source, target)
        else:
            print(f"skipped {source.name}: not a name from docs/art-brief.md")
            continue
        w, h = size_of(target)
        print(f"imported {source.name} -> assets/art/{name}.png ({w}x{h})")
    drawings = {png.stem: size_of(png) for png in [*ART.glob("*.png"), *ART.glob("*.jpg")]}
    write_module(drawings)
    print(f"wrote {MODULE.relative_to(ROOT)} ({len(drawings)} drawings)")


if __name__ == "__main__":
    main()
