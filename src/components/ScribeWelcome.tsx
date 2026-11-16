import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Address, addresses } from '../scribe';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';

const choices: { address: Address; label: string }[] = [
  { address: 'lord', label: addresses.lord },
  { address: 'lady', label: addresses.lady },
  { address: 'liege', label: 'My liege' },
];

type ScribeWelcomeProps = {
  onChoose: (address: Address) => void;
};

/** First launch: the scribe introduces itself and asks how to address the user. */
export const ScribeWelcome: FC<ScribeWelcomeProps> = ({ onChoose }) => {
  const { styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.mark}>
        <Text style={styles.markLetter}>S</Text>
      </View>
      <Text style={styles.greeting}>Well met.</Text>
      <Text style={styles.body}>I am thy scribe. I shall keep thy scrolls in good order and strike what is done.</Text>
      <Text style={styles.question}>How shall I address thee?</Text>
      {choices.map(({ address, label }) => (
        <Pressable key={address} style={styles.choice} onPress={() => onChoose(address)}>
          <Text style={styles.choiceText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, paddingHorizontal: 28, backgroundColor: colors.desk },
    mark: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    markLetter: { color: colors.paperFrom, fontFamily: fonts.display, fontSize: 40, lineHeight: 46 },
    greeting: { marginTop: 28, color: colors.onDesk, fontFamily: fonts.display, fontSize: 44 },
    body: { marginTop: 10, color: colors.onDesk, fontFamily: fonts.body, fontSize: 21, lineHeight: 28, opacity: 0.85 },
    question: {
      marginTop: 44,
      marginBottom: 14,
      color: colors.onDeskFaded,
      fontFamily: fonts.bodyItalic,
      fontSize: 18,
    },
    choice: {
      height: 56,
      marginBottom: 10,
      paddingHorizontal: 18,
      justifyContent: 'center',
      borderRadius: 3,
      backgroundColor: colors.paperFrom,
    },
    choiceText: { color: colors.ink, fontFamily: fonts.body, fontSize: 22 },
  });
