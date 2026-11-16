import { type FC, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { capitalize, describeDay, feastOn, isSameDay } from '../calendar';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette, roman } from '../theme';
import type { ChronicleEntry } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Monday first, as a medieval calendar's week runs to Sunday. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type ChronicleMonthProps = {
  entries: ChronicleEntry[];
};

/**
 * One month of the record as a calendar page: the days something was struck or sealed are inked in,
 * feast days are marked in red as in a book of hours, and a day can be touched to read its name.
 */
export const ChronicleMonth: FC<ChronicleMonthProps> = ({ entries }) => {
  const { styles } = useTheme(makeStyles);
  const [today] = useState(() => new Date());
  const [shown, setShown] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [picked, setPicked] = useState<Date>(today);

  const first = new Date(shown.year, shown.month, 1);
  const length = new Date(shown.year, shown.month + 1, 0).getDate();
  // Blank cells before the first, so the days fall under their weekdays.
  const lead = (first.getDay() + 6) % 7;

  const kept = new Set<number>();
  for (const entry of entries) {
    const at = new Date(entry.at);
    if (at.getFullYear() === shown.year && at.getMonth() === shown.month) kept.add(at.getDate());
  }

  const turn = (by: number) => {
    const next = new Date(shown.year, shown.month + by, 1);
    setShown({ year: next.getFullYear(), month: next.getMonth() });
  };
  const isThisMonth = shown.year === today.getFullYear() && shown.month === today.getMonth();
  const pickedHere = picked.getFullYear() === shown.year && picked.getMonth() === shown.month;
  const cells: (number | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length }, (_, index) => index + 1)];

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Pressable onPress={() => turn(-1)} hitSlop={14} accessibilityRole="button" accessibilityLabel="The month before">
          <Text style={styles.turn}>‹</Text>
        </Pressable>
        <Text style={styles.month} maxFontSizeMultiplier={1.3}>
          {MONTHS[shown.month]} {roman(shown.year)}
        </Text>
        {/* There is no record of days to come. */}
        <Pressable onPress={() => turn(1)} hitSlop={14} disabled={isThisMonth} accessibilityRole="button" accessibilityLabel="The month after">
          <Text style={[styles.turn, isThisMonth && styles.spent]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekday} maxFontSizeMultiplier={1.2}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`blank-${index}`} style={styles.cell} />;
          const date = new Date(shown.year, shown.month, day);
          const feast = feastOn(date);
          const isKept = kept.has(day);
          const isToday = isSameDay(date, today);
          const isPicked = pickedHere && picked.getDate() === day;
          return (
            <Pressable
              key={day}
              style={styles.cell}
              onPress={() => setPicked(date)}
              accessibilityRole="button"
              accessibilityLabel={`${describeDay(date)}${isKept ? ', work was done' : ''}`}
            >
              <View style={[styles.day, isKept && styles.dayKept, isToday && styles.dayToday, isPicked && styles.dayPicked]}>
                <Text style={[styles.numeral, feast && styles.feast, isKept && styles.numeralKept]} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                  {roman(day)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.named} numberOfLines={2}>
        {capitalize(describeDay(pickedHere ? picked : first))}
      </Text>
      <Text style={styles.tally}>
        {kept.size === 0 ? 'No day kept this month.' : `${roman(kept.size)} ${kept.size === 1 ? 'day' : 'days'} kept this month.`}
      </Text>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    page: {
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: 3,
      backgroundColor: colors.paperFrom,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 8 },
    month: { color: colors.accent, fontFamily: fonts.display, fontSize: 22 },
    turn: { color: colors.ink, fontSize: 28, lineHeight: 30, paddingHorizontal: 6 },
    spent: { opacity: 0.2 },
    week: { flexDirection: 'row' },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', color: colors.inkFaded, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1, marginBottom: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' },
    day: { minWidth: 34, height: 30, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
    // A day on which something was struck or sealed is inked in.
    dayKept: { backgroundColor: colors.ink },
    dayToday: { borderWidth: 1, borderColor: colors.accent },
    dayPicked: { borderWidth: 1.5, borderColor: colors.gold },
    numeral: { color: colors.ink, fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.2 },
    numeralKept: { color: colors.paperFrom },
    // Feast days are written in red, the original red-letter days.
    feast: { color: colors.accent },
    named: { marginTop: 10, paddingHorizontal: 6, color: colors.ink, fontFamily: fonts.bodyItalic, fontSize: 17 },
    tally: { marginTop: 2, paddingHorizontal: 6, color: colors.inkFaded, fontFamily: fonts.label, fontSize: 13, letterSpacing: 0.6 },
  });
