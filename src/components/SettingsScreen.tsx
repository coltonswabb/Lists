import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addresses } from '../scribe';
import type { useSettings } from '../settings';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette, type ThemeName, themeNames, themes } from '../theme';

const scribeLabels = { chatty: 'Chatty', quiet: 'Quiet', silent: 'Silent' } as const;

type SettingsScreenProps = {
  settings: ReturnType<typeof useSettings>;
  onClose: () => void;
};

/** The papers are shown as themselves, so each can be judged before it is chosen. */
export const SettingsScreen: FC<SettingsScreenProps> = ({ settings, onClose }) => {
  const { styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();

  // Every other row is a setting and its current value; tapping the row moves to the next value.
  const rows = [
    { label: 'Sound', value: settings.sound ? 'On' : 'Off', onPress: settings.toggleSound },
    { label: 'Scribe', value: scribeLabels[settings.scribe], onPress: settings.nextScribeMode },
    {
      label: 'Address me as',
      value: settings.address ? addresses[settings.address] : '',
      onPress: () => settings.chooseAddress(null),
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={onClose} hitSlop={14}>
          <Text style={styles.action}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <Text style={styles.heading}>Paper</Text>
        <View accessibilityRole="radiogroup">
          {themeNames.map((name) => (
            <PaperChoice
              key={name}
              name={name}
              chosen={settings.theme === name}
              onChoose={() => settings.chooseTheme(name)}
            />
          ))}
        </View>
        <View style={styles.rows}>
          {rows.map((row) => (
            <Pressable key={row.label} style={styles.row} onPress={row.onPress}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>{row.value}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

type PaperChoiceProps = {
  name: ThemeName;
  chosen: boolean;
  onChoose: () => void;
};

/** One paper on its own desk: a strip shading from its top tone to its bottom one, written in its ink. */
const PaperChoice: FC<PaperChoiceProps> = ({ name, chosen, onChoose }) => {
  const { styles } = useTheme(makeStyles);
  const paper = themes[name];
  return (
    <Pressable
      onPress={onChoose}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={paper.label}
      style={[styles.choice, { backgroundColor: paper.desk, borderColor: chosen ? paper.rod : 'transparent' }]}
    >
      <View style={[styles.knob, { backgroundColor: paper.accent }]} />
      <View style={[styles.collar, { backgroundColor: paper.rod }]} />
      <LinearGradient
        colors={[paper.paperFrom, paper.paperTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.strip}
      >
        <Text style={[styles.numeral, { color: paper.accent }]}>I</Text>
        <Text style={[styles.sample, { color: paper.ink }]} numberOfLines={1}>
          {paper.label}
        </Text>
      </LinearGradient>
      <View style={[styles.collar, { backgroundColor: paper.rod }]} />
      <View style={[styles.knob, { backgroundColor: paper.accent }]} />
      <View style={styles.sealRoom}>
        {chosen ? (
          <View style={[styles.seal, { backgroundColor: paper.accent }]}>
            <Text style={[styles.sealMark, { color: paper.desk }]}>✓</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.desk },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      height: 56,
      marginBottom: 4,
    },
    title: { color: colors.onDesk, fontFamily: fonts.display, fontSize: 30 },
    action: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18 },
    heading: {
      marginHorizontal: 22,
      marginBottom: 8,
      color: colors.onDeskFaded,
      fontFamily: fonts.bodyItalic,
      fontSize: 18,
    },
    choice: {
      height: 64,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingLeft: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 4,
      borderWidth: 2,
    },
    knob: { width: 7, height: 7, borderRadius: 3.5 },
    collar: { width: 3, height: 44, borderRadius: 1 },
    strip: {
      flex: 1,
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      borderRadius: 2,
    },
    numeral: { width: 26, fontFamily: fonts.label, fontSize: 15, letterSpacing: 0.6 },
    sample: { flex: 1, fontFamily: fonts.body, fontSize: 19 },
    sealRoom: { width: 44, alignItems: 'center' },
    seal: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    sealMark: { fontSize: 13, fontWeight: '700' },
    rows: { marginTop: 16 },
    row: {
      height: 58,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 3,
      backgroundColor: colors.paperFrom,
    },
    label: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
    value: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 20 },
  });
