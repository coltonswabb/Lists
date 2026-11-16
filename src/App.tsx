import { StatusBar } from 'expo-status-bar';
import { type FC, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureList } from './components/GestureList';
import { UndoToast } from './components/UndoToast';
import { useLists } from './store';
import { colors } from './theme';

export const App: FC = () => {
  const store = useLists();
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
        {openList ? (
          <GestureList
            key={openList.id}
            title={openList.name}
            palette="items"
            placeholder="New item"
            emptyHint="Pull down or tap to add an item"
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
                    <Text style={styles.footerAction}>Uncheck all</Text>
                  </Pressable>
                  <Pressable onPress={() => store.clearDone(openList.id)} hitSlop={10}>
                    <Text style={styles.footerAction}>Clear completed</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        ) : store.loaded ? (
          <GestureList
            key="lists"
            title="Lists"
            palette="lists"
            placeholder="New list"
            emptyHint="Pull down or tap to add a list"
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
  root: { flex: 1, backgroundColor: colors.background },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: 22 },
  footerAction: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
});
