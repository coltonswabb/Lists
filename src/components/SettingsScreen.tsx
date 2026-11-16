import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addresses } from '../scribe';
import type { useSettings } from '../settings';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette, themes } from '../theme';

const scribeLabels = { chatty: 'Chatty', quiet: 'Quiet', silent: 'Silent' } as const;

type SettingsScreenProps = {
  settings: ReturnType<typeof useSettings>;
  onClose: () => void;
};

/** Every row is a setting and its current value; tapping the row moves to the next value. */
export const SettingsScreen: FC<SettingsScreenProps> = ({ settings, onClose }) => {
  const { styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();

  const rows = [
    { label: 'Paper', value: themes[settings.theme].label, onPress: settings.nextTheme },
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
      {rows.map((row) => (
        <Pressable key={row.label} style={styles.row} onPress={row.onPress}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </Pressable>
      ))}
    </View>
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
      marginBottom: 12,
    },
    title: { color: colors.onDesk, fontFamily: fonts.display, fontSize: 30 },
    action: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18 },
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
