import { registerRootComponent } from 'expo';

import { App } from './src/App';
import { TidewheelScreen } from './src/tidewheel/TidewheelScreen';

/** Start with EXPO_PUBLIC_TIDEWHEEL=1 to open the Tidewheel game prototype in place of the app. */
registerRootComponent(process.env.EXPO_PUBLIC_TIDEWHEEL === '1' ? TidewheelScreen : App);
