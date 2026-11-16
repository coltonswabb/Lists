import { EBGaramond_500Medium, EBGaramond_500Medium_Italic } from '@expo-google-fonts/eb-garamond';
import { PirataOne_400Regular } from '@expo-google-fonts/pirata-one';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type FC, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GestureList, type GestureListRow, STAMP_DELAY_MS } from './components/GestureList';
import { ScribeLine } from './components/ScribeLine';
import { ScribeWelcome } from './components/ScribeWelcome';
import { SearchScreen } from './components/SearchScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { UndoToast } from './components/UndoToast';
import { formatReminder } from './reminder';
import { syncReminders } from './reminders';
import { type Address, say, standing } from './scribe';
import { useSettings } from './settings';
import { ThemeProvider, useTheme } from './ThemeContext';
import { play } from './sounds';
import { useLists } from './store';
import { fonts, type Palette, paletteOf, roman } from './theme';
import type { Item, List } from './types';
import { syncWidget } from './widgetSync';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Clearing at least this many items at once earns a word from the scribe. */
const BIG_CLEAR = 5;

const itemsOf = (list: List) => list.items.filter((item) => !item.section);
const openCount = (items: Item[]) => items.filter((item) => !item.done).length;

/** The rows of an open scroll: items under a folded section are left out, and each section reports its progress. */
const scrollRows = (items: Item[]): { rows: GestureListRow[]; visible: Item[] } => {
  const rows: GestureListRow[] = [];
  const visible: Item[] = [];
  let folded = false;
  items.forEach((item, index) => {
    if (!item.section) {
      if (folded) return;
      // A reminder shows as its time, and reappears in the text when the row is edited so it survives the edit.
      const reminder = item.remindAt && !item.done ? formatReminder(item.remindAt) : null;
      rows.push(reminder ? { ...item, badge: reminder.toUpperCase(), editText: `${item.text} @ ${reminder}` } : item);
      visible.push(item);
      return;
    }
    folded = item.collapsed === true;
    let end = index + 1;
    while (end < items.length && !items[end]?.section) end += 1;
    const own = items.slice(index + 1, end);
    const open = openCount(own);
    const cleared = own.length > 0 && open === 0;
    const mark = cleared ? '❦' : own.length > 0 ? roman(open) : '';
    rows.push({ ...item, badge: folded ? `${mark} ···`.trim() : mark, badgeAccent: cleared && !folded });
    visible.push(item);
  });
  return { rows, visible };
};

type Settings = ReturnType<typeof useSettings>;

const Screens: FC<{ settings: Settings; address: Address }> = ({ settings, address }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const store = useLists();
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** A silent scribe says nothing at all, not even its standing lines. */
  const spoken = (line: string) => (settings.scribe === 'silent' ? '' : line);

  // Whatever changes in the lists is mirrored to the system: scheduled reminders and the home screen widget.
  useEffect(() => {
    if (!store.loaded) return;
    void syncReminders(store.lists, address);
    void syncWidget(store.lists, colors, address);
  }, [store.loaded, store.lists, address, colors]);
  // The scroll whose last item was just finished: its seal is stamped on when the shelf next appears.
  const [freshSeal, setFreshSeal] = useState<string | null>(null);
  // The scribe greets once per visit, then waits for instructions.
  const [greeted, setGreeted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGreeted(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const undoLast = () => {
    say('restore');
    store.undoLast();
  };
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const openList = store.lists.find((list) => list.id === openListId);

  useEffect(() => {
    if (!openList && !searching && !settingsOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settingsOpen) setSettingsOpen(false);
      else if (searching) setSearching(false);
      else setOpenListId(null);
      return true;
    });
    return () => subscription.remove();
  }, [openList, searching, settingsOpen]);

  useEffect(() => {
    if (!freshSeal || openListId) return;
    const stamp = setTimeout(() => play('seal'), STAMP_DELAY_MS);
    const clear = setTimeout(() => setFreshSeal(null), STAMP_DELAY_MS + 1200);
    return () => {
      clearTimeout(stamp);
      clearTimeout(clear);
    };
  }, [freshSeal, openListId]);

  if (settingsOpen) return <SettingsScreen settings={settings} onClose={() => setSettingsOpen(false)} />;

  if (searching) {
    return (
      <SearchScreen
        lists={store.lists}
        onClose={() => setSearching(false)}
        onOpen={(listId) => {
          setSearching(false);
          setOpenListId(listId);
        }}
      />
    );
  }

  if (openList) {
    const { rows, visible } = scrollRows(openList.items);
    const items = itemsOf(openList);
    const remaining = openCount(items);
    // Rows are shown without folded items, so positions on screen are mapped back to positions in the scroll.
    const positionOf = (visibleIndex: number) => {
      const row = visible[visibleIndex];
      return row ? openList.items.indexOf(row) : openList.items.length;
    };
    return (
      <>
        <GestureList
          key={openList.id}
          title={openList.name}
          // Latin in the readout only, as on an instrument's faceplate: "things" left, or "the end".
          readout={items.length > 0 && remaining === 0 ? 'FINIS' : `${roman(remaining)} RES`}
          variant="scroll"
          placeholder="New item"
          emptyHint="Pull down or tap to add"
          rows={rows}
          subheader={
            <ScribeLine
              standing={spoken(
                items.length === 0 ? standing.blank(address) : remaining === 0 ? standing.done(address) : '',
              )}
            />
          }
          onAdd={(texts, index) => {
            say('add');
            store.addItems(openList.id, texts, positionOf(index));
          }}
          onRename={(id, text) => store.renameItem(openList.id, id, text)}
          onDelete={(id) => {
            play('seal');
            say('strike');
            store.deleteItem(openList.id, id);
          }}
          onMove={(from, to) => store.moveItem(openList.id, positionOf(from), positionOf(to))}
          onComplete={(id) => {
            const finishing = !openList.items.find((item) => item.id === id)?.done;
            if (finishing) play('lute');
            if (finishing) say(remaining === 1 ? 'finish' : 'complete');
            if (finishing && remaining === 1) setFreshSeal(openList.id);
            store.toggleItem(openList.id, id);
          }}
          onPressLead={(id) => store.toggleSection(openList.id, id)}
          onRenameTitle={(name) => store.renameList(openList.id, name)}
          onBack={() => setOpenListId(null)}
          backLabel="Library"
          onPullUp={
            items.some((item) => item.done)
              ? () => {
                  say(items.filter((item) => item.done).length >= BIG_CLEAR ? 'bigClear' : 'strike');
                  store.clearDone(openList.id);
                }
              : undefined
          }
          footer={
            items.some((item) => item.done) ? (
              <View style={styles.footer}>
                <Pressable onPress={() => store.uncheckAll(openList.id)} hitSlop={10}>
                  <Text style={styles.label}>Unmark all</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
        <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
      </>
    );
  }

  if (!store.loaded) return null;

  // A scroll with work left on it that nobody has touched for a week.
  const dusty = store.lists.find(
    (list) => openCount(itemsOf(list)) > 0 && list.touchedAt !== undefined && Date.now() - list.touchedAt > WEEK_MS,
  );

  return (
    <>
      <GestureList
        key="shelf"
        title="Library"
        readout={`${roman(store.lists.length)} ROTULI`}
        variant="shelf"
        placeholder="New scroll"
        emptyHint="Pull down or tap to add a scroll"
        rows={store.lists.map((list) => {
          const items = itemsOf(list);
          const open = openCount(items);
          const sealed = items.length > 0 && open === 0;
          return { id: list.id, text: list.name, badge: roman(open), sealed, stamp: sealed && list.id === freshSeal };
        })}
        subheader={
          <ScribeLine
            standing={spoken(
              !greeted ? standing.welcome(address) : dusty ? standing.dust(dusty.name, address) : standing.decree(address),
            )}
            onPress={() => settings.chooseAddress(null)}
          />
        }
        onAdd={(names, index) => {
          say('newScroll');
          store.addLists(names, index);
        }}
        onRename={store.renameList}
        onDelete={(id) => {
          play('seal');
          say('strike');
          store.deleteList(id);
        }}
        onMove={store.moveList}
        onOpen={setOpenListId}
      />
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => setSearching(true)} hitSlop={12}>
          <Text style={styles.deskLabel}>Search</Text>
        </Pressable>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12}>
          <Text style={styles.deskLabel}>Settings</Text>
        </Pressable>
      </View>
      <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
    </>
  );
};

export const App: FC = () => {
  const [fontsLoaded] = useFonts({
    PirataOne_400Regular,
    EBGaramond_500Medium,
    EBGaramond_500Medium_Italic,
  });
  const settings = useSettings();
  const palette = useMemo(() => paletteOf(settings.theme), [settings.theme]);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.desk }}>
      <SafeAreaProvider>
        <ThemeProvider value={palette}>
          <StatusBar style="light" />
          {!fontsLoaded || !settings.loaded ? null : settings.address ? (
            <Screens settings={settings} address={settings.address} />
          ) : (
            <ScribeWelcome onChoose={settings.chooseAddress} />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: 20 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  label: { color: colors.accent, fontFamily: fonts.bodyItalic, fontSize: 18 },
    // Labels that sit on the desk rather than on paper: the accent is tuned for paper and can be too dark here.
    deskLabel: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18, opacity: 0.85 },
});
