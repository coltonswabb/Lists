# Lists

A gesture-driven list app built with Expo and React Native.

- The home screen is a shelf of rolled-up scrolls; tapping one unrolls it.
- Pull down to add a row; pull further inside a scroll to roll it up and go back.
- Keep typing after Return to add several rows; pasting text with line breaks adds one row per line.
- End a row with a colon ("Produce:") or start it with "#" to make it a section heading.
- Swipe right to complete an item, swipe left to delete. Deletes can be restored from the toast.
- Hold a row, then drag to reorder.
- Pinch apart to add a row between two others; pinch together to close a scroll.
- Tap an item to rename it. Tap a scroll's title to rename the scroll.
- Tap a section's painted initial to fold it away. Dragging a section heading moves its items with it.
- Holding a dragged row at the top or bottom edge scrolls the list.
- "Search" on the shelf finds items across every scroll; "Sound" turns the effects on or off.
- A scribe greets you and remarks on what you do. It asks how to address you on first launch; tap its line on the shelf to change that.
- End an item with "@ 5pm" or "@ tomorrow 9am" to be reminded of it.
- "Settings" on the Library screen holds the paper theme, sound, how talkative the scribe is, and how it addresses you.
- At the end of a scroll, keep pulling up to clear the finished items, which sweep off the sheet one after another. "Unmark all" resets a reusable list.
- "Library" at the foot of a scroll rolls it up and returns to the shelf of scrolls.

Data is stored on the device with AsyncStorage. The sound effects in `assets/sounds` are synthesized, not recordings.

```bash
npm install
npx expo start        # then press w for web, or open in a development build
npx tsc --noEmit      # typecheck
```
