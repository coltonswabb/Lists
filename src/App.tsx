import { EBGaramond_500Medium, EBGaramond_500Medium_Italic } from '@expo-google-fonts/eb-garamond';
import { PirataOne_400Regular } from '@expo-google-fonts/pirata-one';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickBackup, shareBackup } from './backup';
import { ChronicleScreen } from './components/ChronicleScreen';
import { DayNightVeil } from './components/DayNightVeil';
import { DeskThings } from './components/DeskThings';
import { tick } from './haptics';
import { Desk } from './components/Desk';
import { GestureList, type GestureListActions, type GestureListRow, STAMP_DELAY_MS } from './components/GestureList';
import { LEAD_WIDTH } from './components/RowLead';
import { Marginalia } from './components/Marginalia';
import { ScribeLine } from './components/ScribeLine';
import { ScribeWelcome } from './components/ScribeWelcome';
import { SearchScreen } from './components/SearchScreen';
import { SendSheet } from './components/SendSheet';
import { SettingsScreen } from './components/SettingsScreen';
import { UndoToast } from './components/UndoToast';
import { formatReminder } from './reminder';
import { syncReminders } from './reminders';
import { type Address, say, standing } from './scribe';
import { useSettings } from './settings';
import { ThemeProvider, useTheme } from './ThemeContext';
import { play, playNote } from './sounds';
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

const Screens: FC<{ settings: Settings; address: Address; onCandle: () => void }> = ({ settings, address, onCandle }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const store = useLists();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  /** When this visit began: a scroll counts as dusty by that moment, so the shelf doesn't change as time ticks. */
  const [openedAt] = useState(Date.now);
  /** The item whose margin was tapped, to be carried to another scroll. */
  const [sending, setSending] = useState<{ listId: string; itemId: string; text: string } | null>(null);
  const { renew } = store;

  // Daily scrolls renew at dawn, so a day can turn while the app sits in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') renew();
    });
    return () => subscription.remove();
  }, [renew]);
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

  const shelf = useRef<GestureListActions>(null);

  useEffect(() => {
    if (!openList && !searching && !settingsOpen && !chronicleOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settingsOpen) setSettingsOpen(false);
      else if (chronicleOpen) setChronicleOpen(false);
      else if (searching) setSearching(false);
      else setOpenListId(null);
      return true;
    });
    return () => subscription.remove();
  }, [openList, searching, settingsOpen, chronicleOpen]);

  useEffect(() => {
    if (!freshSeal || openListId) return;
    const stamp = setTimeout(() => play('seal'), STAMP_DELAY_MS);
    const clear = setTimeout(() => setFreshSeal(null), STAMP_DELAY_MS + 1200);
    return () => {
      clearTimeout(stamp);
      clearTimeout(clear);
    };
  }, [freshSeal, openListId]);

  const backUp = () => {
    shareBackup(store.backup()).catch(() =>
      Alert.alert('The backup could not be made', 'Nothing was changed. Try again in a moment.'),
    );
  };

  const restoreFromFile = () => {
    pickBackup()
      .then((picked) => {
        if (picked.kind === 'canceled') return;
        if (picked.kind === 'invalid') {
          Alert.alert('Not a Decree backup', 'That file holds no scrolls this scribe can read.');
          return;
        }
        const { lists, sealed, entries } = picked.contents;
        Alert.alert(
          'Restore this backup?',
          `It holds ${lists.length} scroll${lists.length === 1 ? '' : 's'}, ${sealed.length} sealed, and ${entries.length} lines of chronicle. They will replace everything now kept.`,
          [
            { text: 'Keep what I have', style: 'cancel' },
            { text: 'Restore', style: 'destructive', onPress: () => store.restore(picked.contents) },
          ],
        );
      })
      .catch(() => Alert.alert('The backup could not be read', 'Nothing was changed.'));
  };

  if (settingsOpen) {
    return (
      <>
        <SettingsScreen settings={settings} onClose={() => setSettingsOpen(false)} onBackup={backUp} onRestore={restoreFromFile} />
        <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
      </>
    );
  }

  if (chronicleOpen) {
    return (
      <>
        <ChronicleScreen
          entries={store.entries}
          sealed={store.sealed}
          address={address}
          onClose={() => setChronicleOpen(false)}
          onUnseal={(id) => {
            say('restore');
            store.unsealList(id);
          }}
          onBurn={(id) => {
            play('seal');
            store.burnSealed(id);
          }}
        />
        <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
      </>
    );
  }

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
            // Each item struck plays the next note of the phrase; the last on the scroll, an Amen.
            if (finishing) {
              if (remaining === 1) play('amen');
              else playNote(items.length - remaining);
            }
            if (finishing) say(remaining === 1 ? 'finish' : 'complete');
            if (finishing && remaining === 1) setFreshSeal(openList.id);
            store.toggleItem(openList.id, id);
          }}
          onPressLead={(id) => {
            const item = openList.items.find((i) => i.id === id);
            if (!item) return;
            if (item.section) store.toggleSection(openList.id, id);
            else if (store.lists.length > 1) setSending({ listId: openList.id, itemId: id, text: item.text });
          }}
          onRenameTitle={(name) => store.renameList(openList.id, name)}
          onBack={() => setOpenListId(null)}
          onPullUp={
            items.some((item) => item.done)
              ? () => {
                  say(items.filter((item) => item.done).length >= BIG_CLEAR ? 'bigClear' : 'strike');
                  store.clearDone(openList.id);
                }
              : undefined
          }
          leadActionLabel={store.lists.length > 1 ? 'Carry to another scroll' : undefined}
          finisArt={<Marginalia seed={openList.id} ink={colors.ink} accent={colors.accent} />}
          footer={
            items.length > 0 ? (
              <View style={styles.footer}>
                <Pressable
                  onPress={() => {
                    if (!openList.daily) say('renew');
                    store.setDaily(openList.id, !openList.daily);
                  }}
                  hitSlop={8}
                  style={[styles.stamp, openList.daily && styles.stampOn]}
                  accessibilityRole="switch"
                  accessibilityLabel="Renew at dawn"
                  accessibilityState={{ checked: openList.daily === true }}
                >
                  <Text style={[styles.stampText, openList.daily && styles.stampTextOn]}>
                    {openList.daily ? 'Renewed at dawn' : 'Renew at dawn'}
                  </Text>
                </Pressable>
                {items.some((item) => item.done) ? (
                  <Pressable
                    onPress={() => store.uncheckAll(openList.id)}
                    hitSlop={8}
                    style={styles.stamp}
                    accessibilityRole="button"
                  >
                    <Text style={styles.stampText}>Unmark all</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
        />
        <SendSheet
          item={sending?.text ?? null}
          scrolls={store.lists.filter((list) => list.id !== openList.id)}
          onClose={() => setSending(null)}
          onSend={(scrollId) => {
            if (sending) {
              say('moved');
              store.sendItem(sending.listId, sending.itemId, scrollId);
            }
            setSending(null);
          }}
        />
        <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
      </>
    );
  }

  if (!store.loaded) return null;

  // A scroll with work left on it that nobody has touched for a week.
  const dusty = store.lists.find(
    (list) => openCount(itemsOf(list)) > 0 && list.touchedAt !== undefined && openedAt - list.touchedAt > WEEK_MS,
  );

  return (
    <>
      <GestureList
        key="shelf"
        actions={shelf}
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
        onComplete={(id) => {
          play('seal');
          say('seal');
          store.sealList(id);
        }}
      />
      <DeskThings
        scrolls={store.lists.length}
        onCandle={onCandle}
        night={settings.theme === 'vigil'}
        onPen={() => {
          tick();
          say('penning');
          shelf.current?.add();
        }}
      />
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => setSearching(true)} hitSlop={12} accessibilityRole="button">
          <Text style={styles.deskLabel}>Search</Text>
        </Pressable>
        <Pressable onPress={() => setChronicleOpen(true)} hitSlop={12} accessibilityRole="button">
          <Text style={styles.deskLabel}>Chronicle</Text>
        </Pressable>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} accessibilityRole="button">
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
  // The sky being drawn over the desk while the candle turns day to night or back.
  const [turning, setTurning] = useState<'night' | 'day' | null>(null);
  const turnSky = () => {
    if (turning) return;
    tick();
    setTurning(settings.theme === 'vigil' ? 'day' : 'night');
  };
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.desk }}>
      <SafeAreaProvider>
        <ThemeProvider value={palette}>
          <StatusBar style="light" />
          <Desk />
          {!fontsLoaded || !settings.loaded ? null : settings.address ? (
            <Screens settings={settings} address={settings.address} onCandle={turnSky} />
          ) : (
            <ScribeWelcome onChoose={settings.chooseAddress} />
          )}
          {turning ? (
            <DayNightVeil
              to={turning}
              onCovered={settings.toggleNight}
              onDone={() => {
                say(turning === 'night' ? 'nightfall' : 'daybreak');
                setTurning(null);
              }}
            />
          ) : null}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  // The scroll's own actions sit in the writing column, right of the margin rule, as a scribe's
  // stamped notes: small red capitals in a ruled frame, filled in once set.
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 18, paddingLeft: 16 + LEAD_WIDTH + 12, paddingRight: 16 },
  stamp: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.accent,
  },
  stampOn: { backgroundColor: colors.accent },
  stampText: { color: colors.accent, fontFamily: fonts.label, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase' },
  stampTextOn: { color: colors.paperFrom },
  controls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
    // Labels that sit on the desk rather than on paper: the accent is tuned for paper and can be too dark here.
    deskLabel: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18, opacity: 0.85 },
});
