import type { FC } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Kind, kindNames, kinds } from '../kinds';
import type { Pattern } from '../patterns';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette, roman } from '../theme';

type PatternSheetProps = {
  open: boolean;
  patterns: Pattern[];
  /** A scroll with nothing on it yet. */
  onBlank: () => void;
  /** A blank scroll of a chosen kind. */
  onKind: (kind: Kind) => void;
  onPattern: (pattern: Pattern) => void;
  onForget: (pattern: Pattern) => void;
  onClose: () => void;
};

/** A sheet over the Library, offered when the quill is taken up and patterns are kept: start blank, or cut to a pattern. */
export const PatternSheet: FC<PatternSheetProps> = ({ open, patterns, onBlank, onKind, onPattern, onForget, onClose }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();

  const askToForget = (pattern: Pattern) =>
    Alert.alert(`Forget the pattern “${pattern.name}”?`, 'Scrolls already cut to it are not touched.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Forget it', style: 'destructive', onPress: () => onForget(pattern) },
    ]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title}>A new scroll</Text>
        {/* What the scroll is for can be said at the start: each kind is tied with its own ribbon. */}
        <Text style={styles.hint}>What is it for?</Text>
        <View style={styles.kinds}>
          {kindNames.map((name) => (
            <Pressable
              key={name}
              style={styles.kind}
              onPress={() => onKind(name)}
              accessibilityRole="button"
              accessibilityLabel={`A ${kinds[name].label} scroll, for ${kinds[name].purpose}`}
            >
              <View style={[styles.ribbon, { backgroundColor: kinds[name].ribbon ?? colors.ink }]} />
              <View style={styles.kindWords}>
                <Text style={styles.kindLabel} numberOfLines={1}>
                  {kinds[name].label}
                  {kinds[name].emblem ? <Text style={styles.kindEmblem}>  {kinds[name].emblem}</Text> : null}
                </Text>
                {/* What it is for, so a kind can be chosen before its name means anything. */}
                <Text style={styles.kindFor} numberOfLines={2}>
                  {kinds[name].purpose}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <ScrollView style={styles.list}>
          <Pressable style={styles.row} onPress={onBlank} accessibilityRole="button">
            <Text style={styles.blank}>A blank scroll</Text>
          </Pressable>
          {patterns.map((pattern) => {
            const items = pattern.lines.filter((line) => !line.section).length;
            return (
              <Pressable
                key={pattern.id}
                style={styles.row}
                onPress={() => onPattern(pattern)}
                onLongPress={() => askToForget(pattern)}
                accessibilityRole="button"
                accessibilityLabel={`Cut to the pattern ${pattern.name}, ${items} items`}
                accessibilityHint="Hold to forget this pattern"
              >
                <Text style={styles.name} numberOfLines={1}>
                  {pattern.name}
                </Text>
                <Text style={styles.count}>{roman(items)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {patterns.length > 0 ? <Text style={styles.hint}>Hold a pattern to forget it.</Text> : null}
        <Pressable onPress={onClose} hitSlop={10} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Not now</Text>
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
    title: { color: colors.ink, fontFamily: fonts.display, fontSize: 26, marginBottom: 12 },
    list: { maxHeight: 260 },
    kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 6 },
    kind: {
      width: '48.5%',
      minHeight: 56,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: colors.rule,
    },
    ribbon: { width: 7, height: 34, borderRadius: 1 },
    kindWords: { flex: 1 },
    kindEmblem: { color: colors.inkFaded, fontFamily: undefined, fontSize: 14 },
    kindFor: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 13, lineHeight: 15 },
    kindLabel: { color: colors.ink, fontFamily: fonts.body, fontSize: 17 },
    row: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.rule,
    },
    blank: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 21 },
    name: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
    count: { color: colors.inkFaded, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1 },
    hint: { marginTop: 4, color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
    cancel: { alignSelf: 'center', marginTop: 14 },
    cancelText: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 18 },
  });
