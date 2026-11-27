import { StatusBar } from 'expo-status-bar';
import { type FC, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { success, thud, tick } from '../haptics';
import TidewheelDom, { type Haptic } from './TidewheelDom';

const FILL = { flex: 1 } as const;

/**
 * The Tidewheel prototype: a coin pusher seen from where the player stands. The game itself is web code (WebGL and a WebAssembly
 * physics engine) shown in a web view, so the only thing done natively is the buzz.
 */
export const TidewheelScreen: FC = () => {
  const onHaptic = useCallback(async (kind: Haptic) => {
    if (kind === 'card' || kind === 'ring') success();
    else if (kind === 'fall') thud();
    else tick();
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" hidden />
      <TidewheelDom onHaptic={onHaptic} dom={{ style: FILL, scrollEnabled: false, bounces: false, contentInsetAdjustmentBehavior: 'never' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05071a' },
});
