# Decree art brief

What to draw or generate so Decree looks hand-made rather than coded, and how each piece will be
used. Drop finished files in `assets/incoming/` with the names below; they get cleaned up, made
transparent, and wired in from there.

## Where the look comes from

Kingdom Come: Deliverance II is set in Bohemia in 1403, and its menus and loading art lean on the
manuscripts made in Prague around then. Those manuscripts are the source to borrow from, not the
game: they are centuries old and public domain, while the game's own art is not ours to copy. Don't
put "Kingdom Come" in a prompt, and don't feed it screenshots from the game.

The manuscripts worth looking at:

- **Velislav Bible** (Prague, c. 1340). Hundreds of pen drawings, lightly tinted, with plain
  outlines and lively figures. This is the closest match for what Decree needs.
- **Wenceslas Bible** (Prague, 1390s). Famous for its margins: bath-maids, knotted love-ribbons,
  kingfishers, wild men, and tendrils of foliage curling off the text.
- **Luttrell Psalter** and **Gorleston Psalter** (England, 14th century). The classic *drolleries*:
  snails jousting knights, hares hunting hunters, monkeys making music.

What they have that our drawings lack: a quill line that swells and thins, hatching instead of
flat fills, odd and funny subjects, and foliage that seems to grow out of the page.

## What is wrong now

- **Marginalia** (`src/components/Marginalia.tsx`): four SVG drawings in one even, thick stroke
  with flat blobs of colour. They read as clip art, not pen work.
- **The scribe's quill** before each line is the ✒ emoji. Apple draws it glossy and photographic,
  and it is the most modern thing on screen.
- **The desk** behind the scroll is a flat colour.
- **The paper grain** (`assets/textures/grain.png`) is a 128px speckle. It reads as noise rather
  than parchment.
- **The wax seal** on a finished scroll is a red circle with a ✓.

## How the pieces will work across the five papers

The papers run from cream to near-black (Night Vigil, Purple Codex), so a drawing in brown ink
would vanish on a dark one. To keep one set of art working everywhere:

- **Line art is drawn in black on pure white**, then turned into transparency (white becomes clear,
  black becomes the line). In the app it is tinted with each paper's ink or accent colour. Most
  image generators handle "white background" far more reliably than "transparent", and since the
  art is a single colour, keying out the white is clean.
- **Full-colour objects** (the wax seal) are kept as they are, on a transparent background. They are
  objects lying on the page, so their colour doesn't need to follow the paper.
- **Textures** are delivered in greyscale and laid over the paper or desk colour at low opacity, so
  one texture serves every theme.

## Asset list

Sizes are what to generate; they get trimmed and scaled down for the phone.

### Tier 1: the biggest improvement

| File | What | Size | Background |
| --- | --- | --- | --- |
| `margin-01.png` … `margin-12.png` | Twelve marginal drawings (subjects below) | 1536×1024 | Black line on white |
| `quill.png` | A quill pen, to replace the ✒ emoji | 1024×1024 | Black line on white |
| `parchment.png` | Seamless parchment texture for the scroll | 1024×1024, tileable | Greyscale |
| `wax-seal.png` | A wax seal for finished scrolls and the Chronicle | 1024×1024 | Transparent |

### Tier 2: the room around the scroll

| File | What | Size | Background |
| --- | --- | --- | --- |
| `desk-scriptorium.png` | Dark oak tabletop | 1024×1024, tileable | Full colour, very dark |
| `desk-vigil.png` | Near-black charred oak | 1024×1024, tileable | Full colour, very dark |
| `desk-lapis.png` | Blue-grey slate | 1024×1024, tileable | Full colour, very dark |
| `desk-verdant.png` | Green counting-cloth (worsted wool) | 1024×1024, tileable | Full colour, very dark |
| `desk-codex.png` | Aubergine leather | 1024×1024, tileable | Full colour, very dark |

The candle glow, vignette and the scroll's shadow on the desk are done in code on top of these, so
the textures themselves stay evenly lit.

### Tier 3: finishing touches

| File | What | Size | Background |
| --- | --- | --- | --- |
| `flourish.png` | Pen-flourished frame for a section's initial (letter left out) | 1024×1024 | Black line on white |
| `divider.png` | A horizontal pen flourish for Chronicle day headings | 2048×512 | Black line on white |
| `empty-shelf.png` | Inkwell, quill and a blank scroll, for an empty Library | 1536×1024 | Black line on white |

## Prompts

Every line-art prompt is a **style block** followed by a **subject**. Keep the style block word for
word so the set matches. Generate a few of each and keep the best; consistency of line weight
matters more than any single drawing.

### Style block for line art

> Pen-and-ink drawing in the manner of a 14th-century Bohemian manuscript margin, like the Velislav
> Bible and the Wenceslas Bible. A single quill line in solid black ink that swells and thins with
> the stroke, from hairline to bold. Shading only by sparse parallel hatching. No colour, no grey,
> no wash, no solid fills, no gradients. One isolated subject, centred, with wide empty space around
> it. Pure white background. No text, no letters, no border, no frame, no signature, no paper
> texture. Flat and clean, like a high-contrast scan.

### Marginal drawings (`margin-01` … `margin-12`)

Each is the style block plus one subject:

1. A snail with its horns raised, facing off against a small knight who kneels with his sword drawn.
2. A hare riding backwards on a hound, blowing a hunting horn.
3. A monkey seated on a stool playing a vielle (a medieval fiddle) with a bow.
4. A fox in a friar's hooded habit preaching from a little pulpit to three geese.
5. A heron standing on one leg in reeds, a fish in its beak.
6. A tonsured monk-scribe asleep at his writing desk, quill still in hand, a cat curled at his feet.
7. A small dragon whose tail turns into a curling vine with leaves.
8. A cat chasing a mouse along a long horizontal branch of oak leaves and acorns.
9. A goose striding along carrying a rolled scroll in its beak.
10. A grotesque: a bird with a man's head wearing a hood, standing on long thin legs.
11. A bear sitting up, reaching into a beehive, bees around it.
12. A flowing vine scroll of acanthus leaves, curling tendrils and round berries, no animals, long and
    horizontal.

### Quill (`quill.png`)

> [style block] A single goose-feather quill pen lying diagonally from lower left to upper right,
> the nib at lower left, the feather's barbs drawn with fine strokes.

### Section-initial flourish (`flourish.png`)

> [style block] A square frame of medieval pen-flourishing ("fleuronnée"): fine looping lines,
> little circles and feathered sprays radiating from all four sides, symmetrical. The square in the
> middle is left completely empty; a letter will be placed there later.

### Chronicle divider (`divider.png`)

> [style block] A long horizontal pen flourish, symmetrical, with a small four-petalled flower at
> the centre and thin curling tendrils running out to both ends. Very wide and short.

### Empty Library (`empty-shelf.png`)

> [style block] A round inkwell with a quill standing in it, beside a short scroll lying partly
> unrolled and blank.

### Parchment texture (`parchment.png`)

> Seamless, tileable texture of medieval calfskin vellum seen straight on, filling the whole frame.
> Greyscale only. Soft mottling, faint hair-follicle specks, gentle cloudy variations and one or two
> very faint stains. Low contrast, mid-to-light grey overall, evenly lit, no shadows, no vignette, no
> edges, no folds, no text or writing.

It will be laid over every paper colour at low opacity, so lower contrast is safer than higher.

### Wax seal (`wax-seal.png`)

> A single round seal of red sealing wax seen from directly above, with irregular blobby edges
> where the wax spread. Pressed into it: a crowned blackletter letter D. Realistic wax with soft
> highlights, slightly glossy. Transparent background, no shadow outside the wax, nothing else in
> frame.

If the generator can't do transparency, ask for a pure white background instead; the wax is a
single object, so it cuts out cleanly.

### Desks (`desk-*.png`)

All five share this start, then add the material:

> Seamless, tileable texture seen straight from above, filling the whole frame, evenly lit with no
> shadows, no vignette, no objects, no edges. Very dark overall so light text stays readable on it.

- **Scriptorium:** "Old oak tabletop, fine straight grain, a few faint ink stains and worn knife
  marks. Average colour close to #181614."
- **Night Vigil:** "Charred, almost black oak boards, the grain only just visible. Average colour
  close to #0c0b0a."
- **Lapis:** "Smooth dark blue-grey slate with faint pale veins. Average colour close to #10141d."
- **Verdant:** "Dark green worsted wool cloth, like a medieval counting-table cover, a fine visible
  weave. Average colour close to #121610."
- **Codex:** "Deep aubergine leather, fine grain, softly worn. Average colour close to #120c16."

## Which tool

- **ChatGPT image generation** (GPT image models) follows long prompts well and can output a
  transparent background directly, which suits the wax seal. Good for the line art too.
- **Midjourney** has the strongest painterly textures (the desks, the parchment), but can't output
  transparency, and its line art tends to add shading. Add `--style raw` and keep "no grey, no
  wash" in the prompt.
- **Seamless tiling:** Midjourney's `--tile` flag makes true tileable textures. Elsewhere, check the
  edges by placing two copies side by side.

Check each tool's terms for commercial use if Decree will be sold.

## Alternative: real manuscript scans

The manuscripts themselves are public domain, and many libraries publish scans. A real drollery
from the Wenceslas Bible, cleaned up, would beat anything generated. Two cautions: some libraries
attach terms to their scans even when the artwork is public domain, so check each source's licence
(Wikimedia Commons states it per file); and the scans are full colour on toned parchment, so each
one needs isolating and converting to black line art by hand. Any you find are welcome in
`assets/incoming/` alongside a note of where they came from.

## Once the files arrive

1. `python3 scripts/import-art.py` keys out the white, trims the margins, scales each drawing to at
   most 900px wide into `assets/art/`, and rewrites `src/art.ts` so the app picks it up. Run it
   again whenever new files land in `assets/incoming/`.
2. Marginalia replace the SVG drawings, tinted with the paper's ink. Each finished scroll keeps the
   same drawing, now chosen from twelve, and they sit within the writing column rather than across
   the margin rule.
3. The quill replaces the ✒ emoji in the scribe's line, tinted to match the line.
4. The parchment texture replaces `grain.png`; each desk texture goes behind its paper, with a
   candle-light glow and the scroll's shadow drawn on top.
5. The wax seal replaces the drawn circle on the shelf and in the Chronicle.
6. The flourish frames each section's painted initial, and the divider rules the Chronicle's days.

All of it is checked in each of the five papers before it ships, and the SVG drawings stay as the
fallback until then.
