import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { todayKey } from '../dates';
import type { Store } from '../store';
import { colors, fonts, space } from '../theme';
import { Finder } from './Finder';

type FindScreenProps = { store: Store };

/** Look up an exercise by muscle, category or equipment, and save new ones to the library. */
export const FindScreen: FC<FindScreenProps> = ({ store }) => (
  <View style={styles.screen}>
    <Text style={styles.title}>Find a lift</Text>
    <Finder
      date={todayKey()}
      days={store.data.days}
      exercises={store.data.exercises}
      ideaAction={{ label: 'Save', onPress: store.addExercise }}
    />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 32,
    paddingBottom: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    textTransform: 'uppercase',
  },
});
