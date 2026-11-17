import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addresses } from '../scribe';
import type { useSettings } from '../settings';
import { useTheme } from '../ThemeContext';
import { DeckleEdge } from './DeckleEdge';
import { PaperOverlay } from './PaperOverlay';
import { Roller, ROLLER_HEIGHT } from './Roller';
import { RowLead } from './RowLead';
import { WaxSeal } from './WaxSeal';
import { fonts, mixColors, type Palette, type ThemeName, themeNames, themes } from '../theme';

const scribeLabels = { chatty: 'Chatty', quiet: 'Quiet', silent: 'Silent' } as const;

type SettingsScreenProps = {
  settings: ReturnType<typeof useSettings>;
  onClose: () => void;
  /** Saves every scroll and the chronicle to a file, through the share sheet. */
  onBackup: () => void;
  /** Replaces everything with a chosen backup file. */
  onRestore: () => void;
};

/** The papers are shown as themselves, so each can be judged before it is chosen. */
export const SettingsScreen: FC<SettingsScreenProps> = ({ settings, onClose, onBackup, onRestore }) => {
  const { colors, styles } = useTheme(makeStyles);
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

  // Each part of the scroll opens as a heading does on any other: a painted initial, and the word beside it.
  const heading = (text: string) => (
    <View style={styles.headingRow} accessibilityRole="header">
      <RowLead lead={{ kind: 'initial', text, pigment: colors.accent, letter: colors.paperFrom, flourish: colors.accent }} />
      <Text style={styles.heading}>{text}</Text>
    </View>
  );

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={onClose} hitSlop={14}>
          <Text style={styles.action}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
      <ScrollView contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 20 }}>
        {/* The settings are a scroll of their own, on the paper now chosen, hung from the same rods as any other. */}
        <View style={styles.topRoller}>
          <Roller paper={colors.paperFrom} />
        </View>
        <LinearGradient colors={[colors.paperFrom, colors.paperTo]} style={styles.sheet}>
        {heading('Paper')}
        <View accessibilityRole="radiogroup" style={styles.papers}>
          {themeNames.map((name) => (
            <PaperChoice
              key={name}
              name={name}
              chosen={settings.theme === name}
              onChoose={() => settings.chooseTheme(name)}
            />
          ))}
        </View>
        <Pressable
          style={styles.row}
          onPress={settings.toggleMatchIcon}
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.matchIcon }}
        >
          <Text style={styles.label}>App icon</Text>
          <Text style={styles.value}>{settings.matchIcon ? 'matches the paper' : 'stays as it is'}</Text>
        </Pressable>
        <Pressable
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`Seal initial, ${settings.seal ?? 'the scribe’s own'}`}
          onPress={() => {
            // The system's own prompt for a line of text exists only on iOS.
            if (Platform.OS !== 'ios') return;
            Alert.prompt(
              'Thy seal',
              'One letter to press into the wax. Leave it empty to keep the scribe’s own seal.',
              [
                { text: 'Leave it', style: 'cancel' },
                { text: 'Press it', onPress: (typed?: string) => settings.chooseSeal(typed ?? '') },
              ],
              'plain-text',
              settings.seal ?? '',
            );
          }}
        >
          <Text style={styles.label}>Seal</Text>
          <View style={styles.sealValue}>
            <Text style={styles.value}>{settings.seal ? `bears “${settings.seal}”` : 'the scribe’s own'}</Text>
            <WaxSeal size={34} />
          </View>
        </Pressable>
        {heading('The desk')}
        <Pressable
          style={styles.row}
          onPress={settings.toggleFollowHour}
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.followHour }}
          accessibilityHint="Whether night falls on the desk by itself at dusk"
        >
          <Text style={styles.label}>Candle</Text>
          <Text style={styles.value}>{settings.followHour ? 'follows the hour' : 'is thine to light'}</Text>
        </Pressable>
        {heading('The scribe')}
        <View>
          {rows.map((row) => (
            <Pressable key={row.label} style={styles.row} onPress={row.onPress} accessibilityRole="button" accessibilityHint="Changes to the next choice">
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>{row.value}</Text>
            </Pressable>
          ))}
        </View>
        {heading('The library')}
        <Pressable style={styles.row} onPress={onBackup} accessibilityRole="button">
          <Text style={styles.label}>Back up</Text>
          <Text style={styles.value}>to a file</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={onRestore} accessibilityRole="button">
          <Text style={styles.label}>Restore</Text>
          <Text style={styles.value}>from a file</Text>
        </Pressable>
          <View style={styles.foot} />
          <PaperOverlay />
          <DeckleEdge side="left" />
          <DeckleEdge side="right" />
        </LinearGradient>
        <View style={styles.bottomRoller}>
          <Roller paper={colors.paperTo} />
        </View>
      </ScrollView>
        {/* Rows slide away into the desk's shadow under the title, not off a hard edge. */}
        <LinearGradient colors={[mixColors(colors.desk, '#000000', 0.45), 'rgba(0,0,0,0)']} style={styles.fade} pointerEvents="none" />
      </View>
    </Animated.View>
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
    // Transparent: the Desk behind every screen shows through.
  screen: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      height: 56,
      marginBottom: 4,
    },
    body: { flex: 1 },
    fade: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
    title: { color: colors.onDesk, fontFamily: fonts.display, fontSize: 30 },
    action: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18 },
    // Raised above the sheet's margin rule, which would otherwise run across the papers' own little desks.
    papers: { zIndex: 1, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.rule },
    topRoller: { zIndex: 1, marginBottom: -ROLLER_HEIGHT / 2 },
    bottomRoller: { zIndex: 1, marginTop: -ROLLER_HEIGHT / 2 },
    sheet: { marginHorizontal: 20, paddingTop: ROLLER_HEIGHT / 2, overflow: 'hidden' },
    foot: { height: ROLLER_HEIGHT / 2 + 14 },
    headingRow: {
      height: 62,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.rule,
    },
    heading: { marginLeft: 3, color: colors.ink, fontFamily: fonts.display, fontSize: 26 },
    choice: {
      height: 60,
      marginHorizontal: 14,
      marginTop: 8,
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
    // A line of the scroll: ruled beneath like any other, with what it is set to written in red at its end.
    row: {
      height: 58,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.rule,
    },
    sealValue: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    label: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
    value: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 20 },
  });
