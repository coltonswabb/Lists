import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold_Italic,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import type { FC } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Sunset } from './components/Controls';
import { DayScreen } from './components/DayScreen';
import { FindScreen } from './components/FindScreen';
import { StatsScreen } from './components/StatsScreen';
import { useStore } from './store';
import type { Store } from './store';
import { colors, fonts, MIN_HIT, space } from './theme';

type Tab = 'log' | 'find' | 'stats';

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'find', label: 'Find' },
  { id: 'stats', label: 'Stats' },
];

const Screen: FC<{ tab: Tab; store: Store }> = ({ tab, store }) => {
  if (tab === 'find') return <FindScreen store={store} />;
  if (tab === 'stats') return <StatsScreen store={store} />;
  return <DayScreen store={store} />;
};

export const App: FC = () => {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('log');
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold_Italic,
  });
  const ready = store.ready && fontsLoaded;

  return (
    <GestureHandlerRootView style={styles.app}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
          <View style={styles.masthead}>
            {fontsLoaded ? <Text style={styles.wordmark}>Rep City</Text> : null}
            <Sunset style={styles.horizon} />
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
            {ready ? <Screen store={store} tab={tab} /> : null}
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
                {fontsLoaded ? <Text style={[styles.tabText, id === tab && styles.tabTextSelected]}>{label}</Text> : null}
                {id === tab ? <Sunset style={styles.tabMark} /> : null}
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
  masthead: { paddingBottom: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs },
  wordmark: { color: colors.text, fontFamily: fonts.display, fontSize: 34, letterSpacing: 1, textTransform: 'uppercase' },
  horizon: { borderRadius: 2, height: 4, width: 96 },
  body: { flex: 1 },
  tabs: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  tab: { alignItems: 'center', flex: 1, height: MIN_HIT + 8, justifyContent: 'center' },
  tabText: { color: colors.textFaint, fontFamily: fonts.heading, fontSize: 19, letterSpacing: 2, textTransform: 'uppercase' },
  tabTextSelected: { color: colors.text },
  tabMark: { borderRadius: 2, bottom: 6, height: 3, position: 'absolute', width: 28 },
});
