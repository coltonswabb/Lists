import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { PirataOne_400Regular } from '@expo-google-fonts/pirata-one';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type FC, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GestureList, type GestureListRow } from './components/GestureList';
import { SearchScreen } from './components/SearchScreen';
import { UndoToast } from './components/UndoToast';
import { useSettings } from './settings';
import { play } from './sounds';
import { useLists } from './store';
import { colors, fonts, roman } from './theme';
import type { Item, List } from './types';

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
      rows.push(item);
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

const Screens: FC = () => {
  const insets = useSafeAreaInsets();
  const store = useLists();
  const settings = useSettings();
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const openList = store.lists.find((list) => list.id === openListId);

  useEffect(() => {
    if (!openList && !searching) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (searching) setSearching(false);
      else setOpenListId(null);
      return true;
    });
    return () => subscription.remove();
  }, [openList, searching]);

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
          emptyHint="PULL DOWN OR TAP TO ADD"
          rows={rows}
          onAdd={(texts, index) => store.addItems(openList.id, texts, positionOf(index))}
          onRename={(id, text) => store.renameItem(openList.id, id, text)}
          onDelete={(id) => {
            play('seal');
            store.deleteItem(openList.id, id);
          }}
          onMove={(from, to) => store.moveItem(openList.id, positionOf(from), positionOf(to))}
          onComplete={(id) => {
            if (!openList.items.find((item) => item.id === id)?.done) play('lute');
            store.toggleItem(openList.id, id);
          }}
          onPressLead={(id) => store.toggleSection(openList.id, id)}
          onRenameTitle={(name) => store.renameList(openList.id, name)}
          onBack={() => setOpenListId(null)}
          footer={
            items.some((item) => item.done) ? (
              <View style={styles.footer}>
                <Pressable onPress={() => store.uncheckAll(openList.id)} hitSlop={10}>
                  <Text style={styles.label}>UNMARK ALL</Text>
                </Pressable>
                <Pressable onPress={() => store.clearDone(openList.id)} hitSlop={10}>
                  <Text style={styles.label}>CLEAR DONE</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
        <UndoToast undo={store.undo} onUndo={store.undoLast} onDismiss={store.dismissUndo} offset={0} />
      </>
    );
  }

  if (!store.loaded) return null;

  return (
    <>
      <GestureList
        key="shelf"
        title="Scrolls"
        readout={`${roman(store.lists.length)} ROTULI`}
        variant="shelf"
        placeholder="New scroll"
        emptyHint="PULL DOWN OR TAP TO ADD A SCROLL"
        rows={store.lists.map((list) => {
          const items = itemsOf(list);
          const open = openCount(items);
          return { id: list.id, text: list.name, badge: roman(open), sealed: items.length > 0 && open === 0 };
        })}
        onAdd={store.addLists}
        onRename={store.renameList}
        onDelete={(id) => {
          play('seal');
          store.deleteList(id);
        }}
        onMove={store.moveList}
        onOpen={setOpenListId}
      />
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => setSearching(true)} hitSlop={12}>
          <Text style={styles.label}>SEARCH</Text>
        </Pressable>
        <Pressable onPress={settings.toggleSound} hitSlop={12}>
          <Text style={styles.label}>{settings.sound ? 'SOUND ON' : 'SOUND OFF'}</Text>
        </Pressable>
      </View>
      <UndoToast undo={store.undo} onUndo={store.undoLast} onDismiss={store.dismissUndo} offset={44} />
    </>
  );
};

export const App: FC = () => {
  const [fontsLoaded] = useFonts({ PirataOne_400Regular, IBMPlexMono_500Medium });
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {fontsLoaded ? <Screens /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.desk },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: 20 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  label: { color: colors.accent, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2 },
});
