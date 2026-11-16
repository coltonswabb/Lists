import { type FC, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { type Palette, fonts, roman, ROW_HEIGHT } from '../theme';
import type { List } from '../types';

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
    <View style={[styles.screen, { paddingTop: insets.top }]}>
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
          <Text style={styles.action}>CLOSE</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {needle ? <Text style={styles.count}>{`${roman(matches.length)} FOUND`}</Text> : null}
        {matches.map(({ list, item }) => (
          <Pressable key={item.id} style={styles.row} onPress={() => onOpen(list.id)}>
            <Text style={[styles.text, item.done && styles.done]} numberOfLines={1}>
              {item.text}
            </Text>
            <Text style={styles.source} numberOfLines={1}>
              {list.name.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, height: 56 },
  input: { flex: 1, color: colors.onDesk, fontSize: 18, fontWeight: '500', padding: 0 },
  action: { color: colors.onDesk, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2 },
  count: {
    color: colors.onDeskFaded,
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    height: ROW_HEIGHT,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 4,
    backgroundColor: colors.parchment,
  },
  text: { flex: 1, color: colors.ink, fontSize: 18, fontWeight: '500' },
  done: { color: colors.inkFaded, textDecorationLine: 'line-through', textDecorationColor: colors.accent },
  source: { maxWidth: 120, color: colors.inkFaded, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1 },
});
