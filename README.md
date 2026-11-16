# Decree

A gesture-driven list app built with Expo and React Native.

- The home screen is a shelf of rolled-up scrolls; tapping one unrolls it.
- Pull down to add a row; pull further inside a scroll to roll it up and go back.
- Keep typing after Return to add several rows; pasting text with line breaks adds one row per line.
- End a row with a colon ("Produce:") or start it with "#" to make it a section heading.
- Swipe right to complete an item, swipe left to cast it out. Deletes can be restored from the toast.
- Tap an item's numeral to carry it to another scroll.
- Hold a row, then drag to reorder.
- Pinch apart to add a row between two others; pinch together to close a scroll.
- Tap an item to rename it. Tap a scroll's title to rename the scroll.
- Tap a section's painted initial to fold it away. Dragging a section heading moves its items with it.
- Holding a dragged row at the top or bottom edge scrolls the list.
- "Search" on the shelf finds items across every scroll; "Sound" turns the effects on or off.
- A scribe greets you and remarks on what you do. It asks how to address you on first launch; tap its line on the shelf to change that.
- End an item with "@ 5pm" or "@ tomorrow 9am" to be reminded of it, or by the canonical hours: "@ lauds" (5am), "@ prime" (6am), "@ terce" (9am), "@ sext" (noon), "@ nones" (3pm), "@ vespers" (6pm), "@ compline" (9pm), "@ matins" (3am).
- "Settings" on the Library screen holds the paper theme, sound, how talkative the scribe is, and how it addresses you.
- At the end of a scroll, keep pulling up to clear the finished items, which sweep off the sheet one after another. "Unmark all" resets a reusable list.
- The ‹ beside a scroll's title rolls it up and returns to the shelf of scrolls.
- At the foot of a scroll, "Renew at dawn" makes it a daily scroll whose items are unmarked again each morning.
- A finished scroll earns a small drawing in its margin beside "Finis".
- On the shelf, swipe a scroll right to seal it into the Chronicle. The Chronicle keeps sealed scrolls (return them to the shelf, or burn them) and a dated record of everything struck done, named by feast days ("the Monday after Martinmas") and marked with the hour of the office.
- Settings can back up every scroll and the Chronicle to a file through the share sheet, and restore from one.

- Each item struck done plays the next note of a short plucked phrase in D Dorian, so finishing a scroll plays a tune; the last item is answered with a sung Amen. Rolling a scroll up plays its paper sound slower and lower.
- Choosing a paper in Settings also gives the app the matching home screen icon.

Data is stored on the device with AsyncStorage. The sound effects in `assets/sounds` are synthesized, not recordings: `scripts/make-notes.py` writes the notes and the Amen. The per-paper app icons in `assets/icons` are drawn by `scripts/draw-icons.py` from the palettes in `src/theme.ts`.

```bash
npm install
npx expo start        # then press w for web, or open in a development build
npx tsc --noEmit      # typecheck
```
