import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import type { FC } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DayScreen } from './components/DayScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { useStore } from './store';
import { colors, MIN_HIT } from './theme';

type Tab = 'log' | 'library';

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'library', label: 'Exercises' },
];

export const App: FC = () => {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('log');

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
          {store.ready ? tab === 'log' ? <DayScreen store={store} /> : <LibraryScreen store={store} /> : null}
        </KeyboardAvoidingView>
        <View style={styles.tabs}>
          {TABS.map(({ id, label }) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: id === tab }}
              key={id}
              onPress={() => setTab(id)}
              style={styles.tab}
            >
              <Text style={[styles.tabText, id === tab && styles.tabTextSelected]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
  body: { flex: 1 },
  tabs: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  tab: { alignItems: 'center', flex: 1, height: MIN_HIT + 4, justifyContent: 'center' },
  tabText: { color: colors.textFaint, fontSize: 15, fontWeight: '600' },
  tabTextSelected: { color: colors.accent },
});
