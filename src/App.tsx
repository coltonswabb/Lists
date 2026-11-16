import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { PirataOne_400Regular } from '@expo-google-fonts/pirata-one';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type FC, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureList } from './components/GestureList';
import { UndoToast } from './components/UndoToast';
import { useLists } from './store';
import { colors, fonts, roman } from './theme';

export const App: FC = () => {
  const store = useLists();
  const [fontsLoaded] = useFonts({ PirataOne_400Regular, IBMPlexMono_500Medium });
  const [openListId, setOpenListId] = useState<string | null>(null);
  const openList = store.lists.find((list) => list.id === openListId);
  const openItems = openList?.items.filter((item) => !item.section) ?? [];
  const remaining = openItems.filter((item) => !item.done).length;
  // Latin in the readout only, as on an instrument's faceplate: "things" left, or "the end".
  const openReadout = openItems.length > 0 && remaining === 0 ? 'FINIS' : `${roman(remaining)} RES`;

  useEffect(() => {
    if (!openList) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpenListId(null);
      return true;
    });
    return () => subscription.remove();
  }, [openList]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!fontsLoaded ? null : openList ? (
          <GestureList
            key={openList.id}
            title={openList.name}
            variant="scroll"
            readout={openReadout}
            placeholder="New item"
            emptyHint="PULL DOWN OR TAP TO ADD"
            rows={openList.items}
            onAdd={(texts, index) => store.addItems(openList.id, texts, index)}
            onRename={(id, text) => store.renameItem(openList.id, id, text)}
            onDelete={(id) => store.deleteItem(openList.id, id)}
            onMove={(from, to) => store.moveItem(openList.id, from, to)}
            onComplete={(id) => store.toggleItem(openList.id, id)}
            onRenameTitle={(name) => store.renameList(openList.id, name)}
            onBack={() => setOpenListId(null)}
            footer={
              openList.items.some((item) => item.done) ? (
                <View style={styles.footer}>
                  <Pressable onPress={() => store.uncheckAll(openList.id)} hitSlop={10}>
                    <Text style={styles.footerAction}>UNMARK ALL</Text>
                  </Pressable>
                  <Pressable onPress={() => store.clearDone(openList.id)} hitSlop={10}>
                    <Text style={styles.footerAction}>CLEAR DONE</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        ) : store.loaded ? (
          <GestureList
            key="lists"
            title="Scrolls"
            variant="shelf"
            readout={`${roman(store.lists.length)} ROTULI`}
            placeholder="New scroll"
            emptyHint="PULL DOWN OR TAP TO ADD A SCROLL"
            rows={store.lists.map((list) => ({
              id: list.id,
              text: list.name,
              badge: roman(list.items.filter((item) => !item.done && !item.section).length),
            }))}
            onAdd={store.addLists}
            onRename={store.renameList}
            onDelete={store.deleteList}
            onMove={store.moveList}
            onOpen={setOpenListId}
          />
        ) : null}
        <UndoToast undo={store.undo} onUndo={store.undoLast} onDismiss={store.dismissUndo} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.desk },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: 20 },
  footerAction: { color: colors.accent, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2 },
});
