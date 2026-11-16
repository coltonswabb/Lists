import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

/** The rod a scroll winds onto, drawn flat: a bar with a knob at each end. */
export const Roller: FC = () => (
  <View style={styles.roller}>
    <View style={styles.knob} />
    <View style={styles.rod} />
    <View style={styles.knob} />
  </View>
);

const styles = StyleSheet.create({
  roller: { flexDirection: 'row', alignItems: 'center', height: 14, marginHorizontal: 8 },
  rod: { flex: 1, height: 10, backgroundColor: colors.gold },
  knob: { width: 8, height: 14, borderRadius: 2, backgroundColor: colors.accent },
});
