import { registerRootComponent } from 'expo';
import type { ComponentType } from 'react';

/**
 * Start with EXPO_PUBLIC_TIDEWHEEL=1 to open the Tidewheel game prototype in place of the app.
 *
 * Each is loaded only when chosen: the game needs a web view, which builds of the app made before it was added do not contain, and
 * merely importing it there would stop the app from starting.
 */
const load = (): ComponentType =>
  process.env.EXPO_PUBLIC_TIDEWHEEL === '1'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./src/tidewheel/TidewheelScreen').TidewheelScreen
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./src/App').App;

registerRootComponent(load());
