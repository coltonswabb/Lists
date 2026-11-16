import { IMFellEnglish_400Regular, IMFellEnglish_400Regular_Italic } from '@expo-google-fonts/im-fell-english';
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
import { colors, fonts } from './theme';

export const App: FC = () => {
  const store = useLists();
  const [fontsLoaded] = useFonts({ PirataOne_400Regular, IMFellEnglish_400Regular, IMFellEnglish_400Regular_Italic });
  const [openListId, setOpenListId] = useState<string | null>(null);
  const openList = store.lists.find((list) => list.id === openListId);

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
            palette="items"
            placeholder="New item"
            emptyHint="Pull down or tap to inscribe an item"
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
                    <Text style={styles.footerAction}>Unmark all</Text>
                  </Pressable>
                  <Pressable onPress={() => store.clearDone(openList.id)} hitSlop={10}>
                    <Text style={styles.footerAction}>Strike the finished</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        ) : store.loaded ? (
          <GestureList
            key="lists"
            title="Scrolls"
            palette="lists"
            placeholder="New scroll"
            emptyHint="Pull down or tap to begin a scroll"
            rows={store.lists.map((list) => ({
              id: list.id,
              text: list.name,
              badge: String(list.items.filter((item) => !item.done).length),
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
  footerAction: { color: colors.rubric, fontFamily: fonts.bodyItalic, fontSize: 17 },
});
