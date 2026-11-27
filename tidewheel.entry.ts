import { registerRootComponent } from 'expo';

import { TidewheelScreen } from './src/tidewheel/TidewheelScreen';

/** An entry holding only the Tidewheel game, for publishing it to the web by itself. The app's own entry is index.ts. */
registerRootComponent(TidewheelScreen);
