import { type FC, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { drawings } from '../art';
import { useTheme } from '../ThemeContext';
import { type Palette, fonts, roman, ROW_HEIGHT } from '../theme';
import type { List } from '../types';
import { LineArt } from './LineArt';

type SearchScreenProps = {
  lists: List[];
  onOpen: (listId: string) => void;
  onClose: () => void;
};

export const SearchScreen: FC<SearchScreenProps> = ({ lists, onOpen, onClose }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const matches = needle
    ? lists.flatMap((list) =>
        list.items
          .filter((item) => item.text.toLowerCase().includes(needle))
          .map((item) => ({ list, item })),
      )
    : [];

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search every scroll"
          placeholderTextColor={colors.onDeskFaded}
          selectionColor={colors.accent}
          returnKeyType="search"
          style={styles.input}
        />
        <Pressable onPress={onClose} hitSlop={14}>
          <Text style={styles.action}>Close</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {needle ? <Text style={styles.count}>{`${roman(matches.length)} FOUND`}</Text> : null}
        {matches.map(({ list, item }) => (
          <Pressable key={item.id} style={styles.row} onPress={() => onOpen(list.id)}>
            <Text style={[styles.text, item.done && styles.done]} numberOfLines={2}>
              {item.text}
            </Text>
            <Text style={styles.source} numberOfLines={1}>
              from {list.name}
            </Text>
          </Pressable>
        ))}
        {needle && matches.length === 0 ? (
          <View style={styles.nothing}>
            {drawings['nil-found'] ? <LineArt drawing={drawings['nil-found']} width={210} color={colors.onDeskFaded} inkIn={120} /> : null}
            <Text style={styles.none}>No line on any scroll reads so.</Text>
          </View>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  // Transparent: the Desk behind every screen shows through.
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, height: 56 },
  input: { flex: 1, color: colors.onDesk, fontFamily: fonts.body, fontSize: 21, padding: 0 },
  action: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18 },
  count: {
    color: colors.onDeskFaded,
    fontFamily: fonts.label,
    fontSize: 14,
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    minHeight: ROW_HEIGHT,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: colors.parchment,
  },
  text: { color: colors.ink, fontFamily: fonts.body, fontSize: 21 },
  done: { color: colors.inkFaded, textDecorationLine: 'line-through', textDecorationColor: colors.accent },
  source: { color: colors.inkFaded, fontFamily: fonts.bodyItalic, fontSize: 15 },
  nothing: { marginTop: 36, alignItems: 'center', gap: 14 },
  none: { textAlign: 'center', color: colors.onDeskFaded, fontFamily: fonts.bodyItalic, fontSize: 18 },
});
