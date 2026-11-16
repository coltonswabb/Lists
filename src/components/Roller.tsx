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
  roller: { flexDirection: 'row', alignItems: 'center', height: 16, marginHorizontal: 6 },
  rod: { flex: 1, height: 12, backgroundColor: colors.gold },
  knob: { width: 10, height: 16, borderRadius: 4, backgroundColor: colors.rubric },
});
