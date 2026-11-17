import { LinearGradient } from 'expo-linear-gradient';
import type { FC } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { drawings } from '../art';
import { describeDay } from '../calendar';
import { type Address, addresses } from '../scribe';
import { useTheme } from '../ThemeContext';
import { fonts, mixColors, type Palette, roman } from '../theme';
import type { List } from '../types';
import { LineArt } from './LineArt';

type ChestScreenProps = {
  /** The scrolls put away, most recently stored first. */
  stored: List[];
  address: Address;
  onClose: () => void;
  /** Puts a scroll back on the shelf as it was. */
  onReturn: (id: string) => void;
  /** Destroys a stored scroll for good. */
  onCastOut: (id: string) => void;
};

/**
 * The chest: scrolls put away because they are not wanted on the shelf for now. Nothing in here is
 * finished or lost; a scroll is taken out with a touch and comes back exactly as it went in.
 */
export const ChestScreen: FC<ChestScreenProps> = ({ stored, address, onClose, onReturn, onCastOut }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();

  const askToCastOut = (scroll: List) =>
    Alert.alert(`Cast out “${scroll.name}”?`, 'It is taken from the chest and destroyed.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cast it out', style: 'destructive', onPress: () => onCastOut(scroll.id) },
    ]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chest</Text>
        <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button">
          <Text style={styles.action}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.fill}>
        <ScrollView contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 24 }}>
          {stored.length === 0 ? (
            <View style={styles.empty}>
              {drawings['empty-shelf'] ? <LineArt drawing={drawings['empty-shelf']} width={180} color={colors.onDeskFaded} inkIn={150} /> : null}
              <Text style={styles.emptyText}>The chest stands empty, {addresses[address]}.</Text>
              <Text style={styles.hint}>Put a scroll away from the foot of its page.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.heading}>Touch a scroll to return it to the shelf. Hold one to cast it out.</Text>
              {stored.map((scroll) => {
                const items = scroll.items.filter((item) => !item.section);
                const open = items.filter((item) => !item.done).length;
                return (
                  <Pressable
                    key={scroll.id}
                    style={styles.row}
                    onPress={() => onReturn(scroll.id)}
                    onLongPress={() => askToCastOut(scroll)}
                    accessibilityRole="button"
                    accessibilityLabel={`${scroll.name}, ${open} left of ${items.length}`}
                    accessibilityHint="Returns it to the shelf. Hold to cast it out."
                  >
                    <View style={styles.fill}>
                      <Text style={styles.name} numberOfLines={1}>
                        {scroll.name}
                      </Text>
                      <Text style={styles.when} numberOfLines={1}>
                        {scroll.storedAt ? `put away ${describeDay(new Date(scroll.storedAt))}` : 'put away'}
                      </Text>
                    </View>
                    <Text style={styles.count}>{items.length > 0 && open === 0 ? 'FINIS' : roman(open)}</Text>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
        <LinearGradient colors={[mixColors(colors.desk, '#000000', 0.45), 'rgba(0,0,0,0)']} style={styles.fade} pointerEvents="none" />
      </View>
    </Animated.View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // Transparent: the Desk behind every screen shows through.
    screen: { flex: 1 },
    fill: { flex: 1 },
    fade: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, marginBottom: 4 },
    title: { color: colors.onDesk, fontFamily: fonts.display, fontSize: 30 },
    action: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18 },
    heading: { marginHorizontal: 22, marginTop: 8, marginBottom: 10, color: colors.onDeskFaded, fontFamily: fonts.bodyItalic, fontSize: 16 },
    row: {
      minHeight: 58,
      marginHorizontal: 20,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: 3,
      backgroundColor: colors.paperFrom,
    },
    name: { color: colors.ink, fontFamily: fonts.body, fontSize: 20 },
    when: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
    count: { color: colors.inkFaded, fontFamily: fonts.label, fontSize: 14, letterSpacing: 1 },
    empty: { alignItems: 'center', marginTop: 48, gap: 12, paddingHorizontal: 28 },
    emptyText: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 19, textAlign: 'center', opacity: 0.85 },
    hint: { color: colors.onDeskFaded, fontFamily: fonts.bodyItalic, fontSize: 16, textAlign: 'center' },
  });
