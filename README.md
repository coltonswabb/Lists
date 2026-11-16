# Lists

A gesture-driven list app built with Expo and React Native.

- Pull down to add a row; pull further inside a list to go back.
- Keep typing after Return to add several rows in a row; pasting text with line breaks adds one row per line.
- Swipe right to complete an item, swipe left to delete. Deletes can be undone from the toast.
- Hold a row, then drag to reorder.
- Pinch apart to add a row between two others; pinch together to leave a list.
- Tap an item to rename it. Tap a list's title to rename the list.
- Tap the empty space below the rows to add at the bottom.
- "Uncheck all" resets a reusable list; "Clear completed" removes finished items.

Data is stored on the device with AsyncStorage.

```bash
npm install
npx expo start        # then press w for web, or open in a development build
npx tsc --noEmit      # typecheck
```
