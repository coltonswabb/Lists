import type { FC } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';

type SendSheetProps = {
  /** The item being carried, or null when the sheet is closed. */
  item: string | null;
  scrolls: { id: string; name: string }[];
  onSend: (scrollId: string) => void;
  onClose: () => void;
};

/** A sheet of paper over the scroll: which other scroll should this item be carried to? */
export const SendSheet: FC<SendSheetProps> = ({ item, scrolls, onSend, onClose }) => {
  const { styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title} numberOfLines={2}>
          Carry “{item}” to…
        </Text>
        <ScrollView style={styles.list}>
          {scrolls.map((scroll) => (
            <Pressable
              key={scroll.id}
              style={styles.scroll}
              onPress={() => onSend(scroll.id)}
              accessibilityRole="button"
              accessibilityLabel={`Carry to ${scroll.name}`}
            >
              <Text style={styles.name} numberOfLines={1}>
                {scroll.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={onClose} hitSlop={10} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Leave it here</Text>
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
    list: { maxHeight: 320 },
    scroll: {
      height: 52,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.rule,
    },
    name: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
    cancel: { alignSelf: 'center', marginTop: 16 },
    cancelText: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 18 },
  });
