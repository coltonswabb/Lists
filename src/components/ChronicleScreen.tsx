import type { FC } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { drawings, parchment, waxSeal } from '../art';
import { capitalize, describeDay, isSameDay, officeOf } from '../calendar';
import { type Address, addresses } from '../scribe';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';
import type { ChronicleEntry, SealedList } from '../types';
import { LineArt } from './LineArt';
import { Tiled } from './Tiled';

type ChronicleScreenProps = {
  entries: ChronicleEntry[];
  sealed: SealedList[];
  address: Address;
  onClose: () => void;
  onUnseal: (id: string) => void;
  onBurn: (id: string) => void;
};

type Day = { date: Date; entries: ChronicleEntry[] };

/** Newest first, one group per day. */
const byDay = (entries: ChronicleEntry[]): Day[] => {
  const days: Day[] = [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry) continue;
    const date = new Date(entry.at);
    const last = days[days.length - 1];
    if (last && isSameDay(last.date, date)) last.entries.push(entry);
    else days.push({ date, entries: [entry] });
  }
  return days;
};

const dayHeading = (date: Date, now: Date) => {
  const named = describeDay(date);
  return isSameDay(date, now) ? `This day, ${named}` : capitalize(named);
};

/**
 * The scribe's record: every item struck done and every scroll sealed, dated by the feasts and hours
 * of the day, with the sealed scrolls themselves kept at the front.
 */
export const ChronicleScreen: FC<ChronicleScreenProps> = ({ entries, sealed, address, onClose, onUnseal, onBurn }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const now = new Date();
  const days = byDay(entries);

  const askAbout = (scroll: SealedList) => {
    Alert.alert(scroll.name, `Sealed on ${describeDay(new Date(scroll.sealedAt))}.`, [
      { text: 'Return it to the shelf', onPress: () => onUnseal(scroll.id) },
      {
        text: 'Burn it',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Burn “${scroll.name}”?`, 'It cannot be returned to the shelf afterwards.', [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Burn it', style: 'destructive', onPress: () => onBurn(scroll.id) },
          ]),
      },
      { text: 'Leave it sealed', style: 'cancel' },
    ]);
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chronicle</Text>
        <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button">
          <Text style={styles.action}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {sealed.length > 0 ? (
          <>
            <Text style={styles.heading}>Sealed scrolls</Text>
            {sealed.map((scroll) => (
              <Pressable
                key={scroll.id}
                style={styles.sealed}
                onPress={() => askAbout(scroll)}
                accessibilityRole="button"
                accessibilityLabel={`${scroll.name}, sealed on ${describeDay(new Date(scroll.sealedAt))}`}
              >
                {waxSeal ? (
                  <Image source={waxSeal.source} style={styles.waxSeal} accessibilityElementsHidden />
                ) : (
                  <View style={styles.seal}>
                    <Text style={styles.sealMark}>✓</Text>
                  </View>
                )}
                <View style={styles.fill}>
                  <Text style={styles.sealedName} numberOfLines={1}>
                    {scroll.name}
                  </Text>
                  <Text style={styles.sealedOn} numberOfLines={1}>
                    sealed {describeDay(new Date(scroll.sealedAt))}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        <Text style={styles.heading}>The record</Text>
        <View style={styles.page}>
          {parchment ? (
            // The same mottle as a scroll's paper, so the record reads as a page of the same stock.
            <Tiled source={parchment.source} tile={420} opacity={0.32} />
          ) : null}
          {days.length === 0 ? (
            <Text style={styles.empty}>Nothing is yet set down, {addresses[address]}.</Text>
          ) : (
            days.map((day) => (
              <View key={day.date.toDateString()} style={styles.day}>
                <Text style={styles.dayHeading}>{dayHeading(day.date, now)}</Text>
                {drawings.divider ? (
                  <LineArt drawing={drawings.divider} width={190} color={colors.accent} style={styles.divider} />
                ) : null}
                {day.entries.map((entry, index) => {
                  // The hour is written once, beside the first line set down in it.
                  const office = officeOf(new Date(entry.at));
                  const earlier = day.entries[index - 1];
                  const sameHour = earlier !== undefined && officeOf(new Date(earlier.at)) === office;
                  return (
                  <View key={entry.id} style={styles.entry} accessibilityLabel={`${office}, ${entry.kind === 'sealed' ? `sealed the scroll ${entry.text}` : `${entry.text}, from ${entry.scroll}`}`}>
                    <Text style={styles.office}>{sameHour ? '' : office.toUpperCase()}</Text>
                    <View style={styles.fill}>
                      {entry.kind === 'sealed' ? (
                        <Text style={styles.entryText}>
                          Sealed the scroll <Text style={styles.named}>{entry.text}</Text>
                        </Text>
                      ) : (
                        <>
                          <Text style={styles.entryText}>{entry.text}</Text>
                          <Text style={styles.from} numberOfLines={1}>
                            from {entry.scroll}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // Transparent: the Desk behind every screen shows through.
  screen: { flex: 1 },
    fill: { flex: 1 },
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
      marginTop: 8,
      marginBottom: 8,
      color: colors.onDeskFaded,
      fontFamily: fonts.bodyItalic,
      fontSize: 18,
    },
    sealed: {
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
    seal: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.remove,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    sealMark: { color: colors.onAction, fontSize: 14, fontWeight: '700' },
    waxSeal: { width: 40, height: 40 },
    sealedName: { color: colors.ink, fontFamily: fonts.body, fontSize: 20 },
    sealedOn: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
    page: {
      overflow: 'hidden',
      marginHorizontal: 20,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderRadius: 3,
      backgroundColor: colors.paperFrom,
    },
    empty: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 18 },
    day: { marginBottom: 14 },
    dayHeading: { color: colors.accent, fontFamily: fonts.display, fontSize: 22, marginBottom: 4 },
    divider: { marginBottom: 8, opacity: 0.7 },
    entry: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
    office: {
      width: 74,
      paddingTop: 4,
      color: colors.accent,
      fontFamily: fonts.label,
      fontSize: 12,
      letterSpacing: 0.8,
    },
    entryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 19 },
    named: { fontFamily: fonts.bodyItalic },
    from: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
  });
