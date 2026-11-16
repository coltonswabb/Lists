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
- "Unmark all" resets a reusable list; "Clear done" removes finished items.

Data is stored on the device with AsyncStorage.

```bash
npm install
npx expo start        # then press w for web, or open in a development build
npx tsc --noEmit      # typecheck
```
