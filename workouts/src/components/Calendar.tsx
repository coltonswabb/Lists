import { useMemo } from 'react';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MONTH_NAMES, monthGrid, todayKey } from '../dates';
import { dayCategories } from '../progress';
import { categoryColor, colors, fonts, MIN_HIT, radius, space } from '../theme';
import type { Days, Exercise } from '../types';

export type Month = { year: number; month: number };

type CalendarProps = {
  month: Month;
  selected: string;
  days: Days;
  exercises: Exercise[];
  onSelect: (date: string) => void;
  onMonthChange: (month: Month) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const shiftMonth = ({ year, month }: Month, offset: number): Month => {
  const date = new Date(year, month + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

export const Calendar: FC<CalendarProps> = ({ month, selected, days, exercises, onSelect, onMonthChange }) => {
  const weeks = useMemo(() => monthGrid(month.year, month.month), [month]);
  const today = todayKey();

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Previous month"
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          style={styles.arrow}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {MONTH_NAMES[month.month]} {month.year}
        </Text>
        <Pressable
          accessibilityLabel="Next month"
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          style={styles.arrow}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((name, index) => (
          <Text key={index} style={styles.weekday}>
            {name}
          </Text>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((date, dayIndex) => {
            if (!date) return <View key={dayIndex} style={styles.cell} />;
            const isSelected = date === selected;
            const dots = dayCategories(days, exercises, date).map((category) => categoryColor[category]);
            if ((days[date]?.cardio.length ?? 0) > 0) dots.push(colors.cardio);
            return (
              <Pressable
                accessibilityLabel={date}
                accessibilityState={{ selected: isSelected }}
                key={dayIndex}
                onPress={() => onSelect(date)}
                style={[styles.cell, isSelected && styles.cellSelected]}
              >
                <Text style={[styles.dayNumber, date === today && styles.today]}>{Number(date.slice(8))}</Text>
                <View style={styles.dots}>
                  {dots.map((color) => (
                    <View key={color} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  calendar: { paddingHorizontal: space.sm },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, letterSpacing: 2, textTransform: 'uppercase' },
  arrow: { alignItems: 'center', height: MIN_HIT, justifyContent: 'center', width: MIN_HIT },
  arrowText: { color: colors.accent, fontSize: 30, lineHeight: 32 },
  week: { flexDirection: 'row' },
  weekday: { color: colors.textFaint, flex: 1, fontFamily: fonts.label, fontSize: 14, paddingBottom: space.xs, textAlign: 'center' },
  cell: { alignItems: 'center', borderRadius: radius.sm, flex: 1, height: MIN_HIT + 2, justifyContent: 'center' },
  cellSelected: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent, borderWidth: 1 },
  dayNumber: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontVariant: ['tabular-nums'] },
  today: { color: colors.accent },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 3 },
  dot: { borderRadius: 3, height: 6, width: 6 },
});
