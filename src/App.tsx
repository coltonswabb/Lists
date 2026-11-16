import { StatusBar } from 'expo-status-bar';
import { type FC, useEffect, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureList } from './components/GestureList';
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
            onAdd={(text, at) => store.addItem(openList.id, text, at)}
            onRename={(id, text) => store.renameItem(openList.id, id, text)}
            onDelete={(id) => store.deleteItem(openList.id, id)}
            onComplete={(id) => store.toggleItem(openList.id, id)}
            onBack={() => setOpenListId(null)}
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
            onAdd={store.addList}
            onRename={store.renameList}
            onDelete={store.deleteList}
            onOpen={setOpenListId}
          />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
