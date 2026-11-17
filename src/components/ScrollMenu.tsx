import type { FC } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Kind, kindNames, kinds } from '../kinds';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';

export type ScrollChoice = {
  label: string;
  /** One line saying what choosing it does, so nothing has to be tried to be understood. */
  note: string;
  /** For something that is either on or off: which it is now. Left out for something done once. */
  on?: boolean;
  onPress: () => void;
};

type ScrollMenuProps = {
  open: boolean;
  /** The scroll's name, which heads the sheet. */
  title: string;
  choices: ScrollChoice[];
  /** What the scroll is for now, and a way to change it. */
  kind: Kind;
  onKind: (kind: Kind) => void;
  onClose: () => void;
};

/**
 * A sheet over an open scroll holding what can be done to the whole of it. These are wanted seldom, so they
 * are kept here, each with a line saying what it does, and not stood in a row at the scroll's foot.
 */
export const ScrollMenu: FC<ScrollMenuProps> = ({ open, title, choices, kind, onKind, onClose }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.heading}>What this scroll is for</Text>
        <View style={styles.kinds} accessibilityRole="radiogroup">
          {kindNames.map((name) => (
            <Pressable
              key={name}
              onPress={() => onKind(name)}
              style={[styles.kind, name === kind && styles.kindChosen]}
              accessibilityRole="radio"
              accessibilityState={{ selected: name === kind }}
              accessibilityLabel={`${kinds[name].label}, for ${kinds[name].purpose}`}
            >
              <View style={[styles.ribbon, { backgroundColor: kinds[name].ribbon ?? colors.ink }]} />
              <View style={styles.kindWords}>
                <Text style={styles.kindLabel} numberOfLines={1}>
                  {kinds[name].label}
                </Text>
                <Text style={styles.kindFor} numberOfLines={2}>
                  {kinds[name].purpose}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        {choices.map((choice) => (
          <Pressable
            key={choice.label}
            style={styles.row}
            onPress={choice.onPress}
            accessibilityRole={choice.on === undefined ? 'button' : 'switch'}
            accessibilityState={choice.on === undefined ? undefined : { checked: choice.on }}
            accessibilityLabel={choice.label}
            accessibilityHint={choice.note}
          >
            <View style={styles.words}>
              <Text style={styles.label}>{choice.label}</Text>
              <Text style={styles.note}>{choice.note}</Text>
            </View>
            {choice.on === undefined ? null : <Text style={[styles.state, choice.on && styles.stateOn]}>{choice.on ? 'On' : 'Off'}</Text>}
          </Pressable>
        ))}
        <Pressable onPress={onClose} hitSlop={10} style={styles.done} accessibilityRole="button">
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      paddingTop: 20,
      paddingHorizontal: 20,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      backgroundColor: colors.paperFrom,
    },
    title: { color: colors.ink, fontFamily: fonts.display, fontSize: 26, marginBottom: 8 },
    heading: { marginBottom: 8, color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
    kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.rule },
    kind: {
      width: '48.5%',
      minHeight: 52,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: colors.rule,
    },
    kindChosen: { borderColor: colors.accent, backgroundColor: colors.paperTo },
    ribbon: { width: 7, height: 32, borderRadius: 1 },
    kindWords: { flex: 1 },
    kindFor: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 13, lineHeight: 15 },
    kindLabel: { color: colors.ink, fontFamily: fonts.body, fontSize: 17 },
    row: {
      minHeight: 64,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.rule,
    },
    words: { flex: 1 },
    label: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
    note: { marginTop: 1, color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
    state: { color: colors.inkFaded, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1 },
    stateOn: { color: colors.accent },
    done: { alignSelf: 'center', marginTop: 14 },
    doneText: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 18 },
  });
