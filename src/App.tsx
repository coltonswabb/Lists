import { EBGaramond_500Medium, EBGaramond_500Medium_Italic } from '@expo-google-fonts/eb-garamond';
import { PirataOne_400Regular } from '@expo-google-fonts/pirata-one';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickBackup, shareBackup } from './backup';
import { PaneWidth } from './PaneWidth';
import { ChestScreen } from './components/ChestScreen';
import { ChronicleScreen } from './components/ChronicleScreen';
import { DayLight } from './components/DayLight';
import { DayNightVeil } from './components/DayNightVeil';
import { DeskThings } from './components/DeskThings';
import { NightLight } from './components/NightLight';
import { PatternSheet } from './components/PatternSheet';
import { SealPress } from './components/SealPress';
import { tick } from './haptics';
import { Desk } from './components/Desk';
import { GestureList, type GestureListActions, type GestureListRow, STAMP_DELAY_MS } from './components/GestureList';
import { Marginalia, nextDrawing } from './components/Marginalia';
import { ScribeLine } from './components/ScribeLine';
import { ScrollMenu } from './components/ScrollMenu';
import { ScribeWelcome } from './components/ScribeWelcome';
import { SearchScreen } from './components/SearchScreen';
import { SendSheet } from './components/SendSheet';
import { SettingsScreen } from './components/SettingsScreen';
import { UndoToast } from './components/UndoToast';
import { formatReminder } from './reminder';
import { listenForReminderActions, syncReminders } from './reminders';
import { readPatterns, usePatterns } from './patterns';
import { type Address, say, standing } from './scribe';
import { useSettings } from './settings';
import { ThemeProvider, useTheme } from './ThemeContext';
import { play, playNote } from './sounds';
import { DAWN_HOUR, dawnDay, isTutorial, plannedDay, useLists } from './store';
import { fonts, type Palette, paletteOf, roman } from './theme';
import type { Item, List } from './types';
import { listenForWidgetStrikes, syncWidget, takeWidgetStrikes } from './widgetSync';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Clearing at least this many items at once earns a word from the scribe. */
const BIG_CLEAR = 5;

/** Whether something planned for a day has come due: unplanned things always have. */
const isDue = (plannedFor: string | undefined, today: string) => plannedFor === undefined || plannedFor <= today;

/**
 * The scrolls as the day sees them: without Tomorrow, without what lies in the chest, without scrolls begun by candlelight for a day
 * to come, and without lines added to the others for a day to come.
 */
const dayView = (lists: List[], today: string): List[] =>
  lists
    .filter((list) => !list.tomorrow && !list.stored && isDue(list.plannedFor, today))
    .map((list) => (list.items.every((item) => isDue(item.plannedFor, today)) ? list : { ...list, items: list.items.filter((item) => isDue(item.plannedFor, today)) }));

const itemsOf = (list: List) => list.items.filter((item) => !item.section);
const openCount = (items: Item[]) => items.filter((item) => !item.done).length;

/** The rows of an open scroll: items under a folded section are left out, and each section reports its progress. */
const scrollRows = (items: Item[], today: string): { rows: GestureListRow[]; visible: Item[] } => {
  const rows: GestureListRow[] = [];
  const visible: Item[] = [];
  let folded = false;
  items.forEach((item, index) => {
    if (!item.section) {
      if (folded) return;
      // A reminder shows as its time, and reappears in the text when the row is edited so it survives the edit.
      const reminder = item.remindAt && !item.done ? formatReminder(item.remindAt, new Date(), item.repeat) : null;
      // Something planned by candlelight is marked: MORROW while it is still to come, NEW on the day it arrives.
      const mark = item.done || item.plannedFor === undefined ? null : item.plannedFor > today ? 'MORROW' : item.plannedFor === today ? 'NEW' : null;
      rows.push(
        reminder
          ? { ...item, badge: mark ? `${mark} · ${reminder.toUpperCase()}` : reminder.toUpperCase(), badgeMarked: mark !== null, editText: `${item.text} @ ${reminder}` }
          : mark
            ? { ...item, badge: mark, badgeMarked: true }
            : item,
      );
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

/** Long enough for the seal to come down and be taken away before the scribe asks about the tutorial. */
const TUTORIAL_OFFER_MS = 1900;

/** The widest a page of the app is drawn, however wide the screen. */
export const PAGE_WIDTH = 640;
/** From this width the shelf and the open scroll are drawn side by side. */
const WIDE_AT = 760;

type Settings = ReturnType<typeof useSettings>;

const Screens: FC<{ settings: Settings; address: Address; night: boolean; onCandle: () => void }> = ({ settings, address, night, onCandle }) => {
  const { colors, styles } = useTheme(makeStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Wide enough for the shelf and an open scroll to lie side by side, as on an iPad.
  const wide = windowWidth >= WIDE_AT;
  const shelfWidth = Math.round(Math.min(400, Math.max(300, windowWidth * 0.38)));
  const store = useLists();
  const { patterns, keep: keepPattern, forget: forgetPattern, replace: replacePatterns } = usePatterns();
  /** The Library's sheet offering a blank scroll or a kept pattern. */
  const [choosing, setChoosing] = useState(false);
  /** The sheet over an open scroll holding what can be done to the whole of it. */
  const [menuOpen, setMenuOpen] = useState(false);
  /** Counts the seals pressed, so each press is its own animation; null when none is showing. */
  const [sealing, setSealing] = useState<number | null>(null);
  const pressSeal = () => setSealing((last) => (last ?? 0) + 1);
  /** Which margin drawing a finished scroll is given: begun at random, and moved on each time a scroll is finished. */
  const [finisTurn, setFinisTurn] = useState(() => Math.floor(Math.random() * 1000));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  /** When this visit began: a scroll counts as dusty by that moment, so the shelf doesn't change as time ticks. */
  const [openedAt] = useState(Date.now);
  /** The item whose margin was tapped, to be carried to another scroll. */
  const [sending, setSending] = useState<{ listId: string; itemId: string; text: string } | null>(null);
  const { renew } = store;
  // The lists as they are now, for listeners that are set up once and must not go stale.
  const { toggleItem, remindLater } = store;
  const listsNow = useRef(store.lists);
  useEffect(() => {
    listsNow.current = store.lists;
  }, [store.lists]);

  // Items struck on the home screen widget are struck here as soon as the app can look: when the
  // lists have loaded, when the app comes forward, and at once if it is running when the button is pressed.
  const strikeFromWidget = useCallback(() => {
    void takeWidgetStrikes().then((ids) => {
      for (const id of ids) {
        const list = listsNow.current.find((candidate) => candidate.items.some((item) => item.id === id && !item.done));
        if (list) toggleItem(list.id, id);
      }
    });
  }, [toggleItem]);
  useEffect(() => {
    if (!store.loaded) return;
    strikeFromWidget();
    return listenForWidgetStrikes(strikeFromWidget);
  }, [store.loaded, strikeFromWidget]);

  // Daily scrolls renew at dawn, so a day can turn while the app sits in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Dawn may have come while the app was away: last night's plans are laid out, or daily scrolls renewed.
      const dawn = renew();
      if (dawn) say(dawn);
      strikeFromWidget();
    });
    return () => subscription.remove();
  }, [renew, strikeFromWidget]);
  // The buttons on a reminder: strike the item, or be reminded again in an hour. The lists are read
  // through a ref so that the listener is set up once, not again on every change.
  useEffect(
    () =>
      listenForReminderActions((action, listId, itemId) => {
        if (action === 'strike') {
          const item = listsNow.current.find((list) => list.id === listId)?.items.find((candidate) => candidate.id === itemId);
          if (item && !item.done) toggleItem(listId, itemId);
        } else remindLater(listId, itemId, Date.now() + 60 * 60 * 1000);
      }),
    [toggleItem, remindLater],
  );
  /** A silent scribe says nothing at all, not even its standing lines. */
  const spoken = (line: string) => (settings.scribe === 'silent' ? '' : line);

  // Whatever changes in the lists is mirrored to the system: scheduled reminders and the home screen widget.
  useEffect(() => {
    if (!store.loaded) return;
    // A scroll in the chest keeps its reminders to itself.
    void syncReminders(store.lists.filter((list) => !list.stored), address);
    // The widget shows the day's scrolls; what is planned for tomorrow stays by the candle.
    void syncWidget(dayView(store.lists, dawnDay(new Date())), colors, address);
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
  // The day it is, counted from dawn. Whatever was planned by candlelight for a later day is kept
  // out of the day's view until then; by night everything is shown, with what is planned marked.
  const today = dawnDay(new Date());
  const dayLists = useMemo(() => dayView(store.lists, today), [store.lists, today]);
  /** The scrolls on the shelf. By day, the day's. By night, all of them, with Tomorrow last. */
  const shelfLists = useMemo(() => (night ? store.lists.filter((list) => !list.stored) : dayLists), [night, store.lists, dayLists]);
  /** What lies in the chest, most recently put away first. */
  const storedLists = useMemo(
    () => store.lists.filter((list) => list.stored).sort((a, b) => (b.storedAt ?? 0) - (a.storedAt ?? 0)),
    [store.lists],
  );
  const openList = shelfLists.find((list) => list.id === openListId);
  /** Where a place on the shelf as shown falls among all the scrolls kept, some of which may be hidden. */
  const shelfPosition = (shown: number) => {
    const at = shelfLists[shown];
    if (at) return store.lists.findIndex((list) => list.id === at.id);
    // Past the last one shown: the end of the shelf, which is before Tomorrow.
    const tomorrowAt = store.lists.findIndex((list) => list.tomorrow);
    return tomorrowAt < 0 ? store.lists.length : tomorrowAt;
  };
  const { ensureTomorrow } = store;
  useEffect(() => {
    if (night && store.loaded) ensureTomorrow();
  }, [night, store.loaded, ensureTomorrow]);

  const shelf = useRef<GestureListActions>(null);
  /** The open scroll's own, kept apart from the shelf's: on a wide screen both are on the desk at once. */
  const scrollActions = useRef<GestureListActions>(null);

  useEffect(() => {
    if (!openList && !searching && !settingsOpen && !chronicleOpen && !chestOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settingsOpen) setSettingsOpen(false);
      else if (chronicleOpen) setChronicleOpen(false);
      else if (chestOpen) setChestOpen(false);
      else if (searching) setSearching(false);
      else setOpenListId(null);
      return true;
    });
    return () => subscription.remove();
  }, [openList, searching, settingsOpen, chronicleOpen, chestOpen]);

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
    shareBackup(store.backup(patterns)).catch(() =>
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
            {
              text: 'Restore',
              style: 'destructive',
              onPress: () => {
                store.restore(picked.contents);
                replacePatterns(readPatterns(picked.contents.patterns));
              },
            },
          ],
        );
      })
      .catch(() => Alert.alert('The backup could not be read', 'Nothing was changed.'));
  };

  // A screen that stands alone keeps a page's width on a wide desk, centred, as it does on a phone.
  const page = (screen: ReactNode) => (wide ? <View style={styles.page}>{screen}</View> : screen);

  if (settingsOpen) {
    return page(
      <>
        <SettingsScreen settings={settings} onClose={() => setSettingsOpen(false)} onBackup={backUp} onRestore={restoreFromFile} />
        <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
      </>
    );
  }

  if (chestOpen) {
    return page(
      <>
        <ChestScreen
          stored={storedLists}
          address={address}
          onClose={() => setChestOpen(false)}
          onReturn={(id) => {
            say('unstored');
            play('paper');
            store.unstoreList(id);
          }}
          onCastOut={(id) => {
            play('seal');
            store.deleteList(id);
          }}
        />
        <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />
      </>
    );
  }

  if (chronicleOpen) {
    return page(
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
    return page(
      <SearchScreen
        lists={store.lists}
        onClose={() => setSearching(false)}
        onOpen={(listId) => {
          setSearching(false);
          // A line found on a scroll in the chest leads to the chest, where the scroll can be taken out.
          if (store.lists.some((list) => list.id === listId && list.stored)) setChestOpen(true);
          else setOpenListId(listId);
        }}
      />
    );
  }

  const scrollPane = !openList
    ? null
    : (() => {
    const isTomorrow = openList.tomorrow === true;
    // The scroll as kept, which may hold lines the day's view leaves out.
    const kept = store.lists.find((list) => list.id === openList.id) ?? openList;
    const { rows, visible } = scrollRows(openList.items, today);
    const items = itemsOf(openList);
    const remaining = openCount(items);
    /** The pattern kept under this scroll's name, if there is one. */
    const keptAs = patterns.find((pattern) => pattern.name === openList.name);
    // Rows are shown without folded items, so positions on screen are mapped back to positions in the scroll.
    const positionOf = (visibleIndex: number) => {
      const row = visible[visibleIndex];
      return row ? kept.items.indexOf(row) : kept.items.length;
    };
    return (
      <>
        <GestureList
          key={openList.id}
          actions={scrollActions}
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
                isTomorrow && remaining > 0
                  ? ''
                  : isTomorrow
                    ? standing.morrow(address)
                    : items.length === 0
                      ? standing.blank(address)
                      : remaining === 0
                        ? standing.done(address)
                        : '',
              )}
            />
          }
          onAdd={(texts, index) => {
            say('add');
            // A line added to one of the day's scrolls by candlelight is for tomorrow, and waits out of sight until then.
            store.addItems(openList.id, texts, positionOf(index), night && !isTomorrow ? plannedDay(new Date()) : undefined);
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
            if (finishing && remaining === 1) {
              setFreshSeal(openList.id);
              pressSeal();
              // Each finishing is rewarded with a different drawing from the last.
              setFinisTurn((turn) => turn + nextDrawing());
              // The teaching scroll has done its work once every line on it is struck: offer to put it away.
              if (isTutorial(openList)) {
                const tutorialId = openList.id;
                setTimeout(() => {
                  Alert.alert('Thy lessons are learned', 'Shall I put the tutorial away in the chest? It can be taken out again whenever it is wanted.', [
                    { text: 'Leave it out', style: 'cancel' },
                    {
                      text: 'To the chest',
                      onPress: () => {
                        say('stored');
                        play('paper', 0.78);
                        store.storeList(tutorialId);
                        setOpenListId(null);
                      },
                    },
                  ]);
                }, TUTORIAL_OFFER_MS);
              }
            }
            store.toggleItem(openList.id, id);
          }}
          onPressLead={(id) => {
            const item = openList.items.find((i) => i.id === id);
            if (!item) return;
            if (item.section) store.toggleSection(openList.id, id);
            else if (store.lists.length > 1) setSending({ listId: openList.id, itemId: id, text: item.text });
          }}
          // Tomorrow keeps its name until dawn gives its lines the day's.
          onRenameTitle={isTomorrow ? undefined : (name) => store.renameList(openList.id, name)}
          onBack={() => setOpenListId(null)}
          onClear={
            items.some((item) => item.done)
              ? () => {
                  say(items.filter((item) => item.done).length >= BIG_CLEAR ? 'bigClear' : 'strike');
                  store.clearDone(openList.id);
                }
              : undefined
          }
          leadActionLabel={store.lists.length > 1 ? 'Carry to another scroll' : undefined}
          finisArt={<Marginalia seed={openList.id} turn={finisTurn} ink={colors.ink} accent={colors.accent} />}
        />
        {/* What can be done to the whole scroll stands at the foot of the desk, as the Library's own labels do. */}
        <View style={[styles.controls, isTomorrow && styles.controlsCentred, { paddingBottom: insets.bottom + 12 }]}>
          {isTomorrow ? (
            <>
              <Text style={styles.deskNote}>At dawn this is laid on the shelf as the day’s scroll.</Text>
              {/* Lines struck here before dawn can still be cleared away, as on any other scroll. */}
              {items.some((item) => item.done) ? (
                <Pressable
                  onPress={() => scrollActions.current?.clear()}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityHint="Removes the struck lines from this scroll"
                >
                  <Text style={styles.deskLabel}>Clear struck</Text>
                </Pressable>
              ) : null}
            </>
          ) : items.length > 0 ? (
            <>
              {/* Only what is wanted often stands here: clearing what is struck, when something is. The rest is behind More. */}
              {items.some((item) => item.done) ? (
                <Pressable
                  onPress={() => scrollActions.current?.clear()}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityHint="Removes the struck lines from this scroll"
                >
                  <Text style={styles.deskLabel}>Clear struck</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} accessibilityRole="button" accessibilityHint="Shows what can be done to this scroll">
                <Text style={styles.deskLabel}>More</Text>
              </Pressable>
            </>
          ) : null}
        </View>
        <ScrollMenu
          open={menuOpen}
          title={openList.name}
          onClose={() => setMenuOpen(false)}
          choices={[
            {
              label: 'Renew at dawn',
              note: 'Every line is unmarked each morning, for a list done daily.',
              on: openList.daily === true,
              onPress: () => {
                say(openList.daily ? 'renewOff' : 'renew');
                store.setDaily(openList.id, !openList.daily);
              },
            },
            {
              label: 'Keep as a pattern',
              note: 'New scrolls can then be cut to this one’s lines, from the quill.',
              on: keptAs !== undefined,
              onPress: () => {
                if (keptAs) forgetPattern(keptAs.id);
                else {
                  say('pattern');
                  keepPattern(openList);
                }
              },
            },
            ...(items.some((item) => item.done)
              ? [
                  {
                    label: 'Unmark all',
                    note: 'Every struck line is put back as not done.',
                    onPress: () => {
                      store.uncheckAll(openList.id);
                      setMenuOpen(false);
                    },
                  },
                ]
              : []),
            {
              label: 'To the chest',
              note: 'Put the scroll away, off the shelf, until it is wanted again.',
              onPress: () => {
                setMenuOpen(false);
                say('stored');
                play('paper', 0.78);
                store.storeList(openList.id);
                setOpenListId(null);
              },
            },
          ]}
        />
        <SendSheet
          item={sending?.text ?? null}
          scrolls={store.lists.filter((list) => list.id !== openList.id && !list.stored)}
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
        {sealing !== null ? <SealPress key={sealing} onDone={() => setSealing(null)} /> : null}
      </>
    );
      })();
  // On a phone the open scroll takes the whole desk; on a wide screen it lies beside the shelf.
  if (scrollPane && !wide) return scrollPane;

  if (!store.loaded) return null;

  // A scroll with work left on it that nobody has touched for a week.
  const isTomorrowScroll = (id: string) => store.lists.some((list) => list.id === id && list.tomorrow);
  const dusty = dayLists.find(
    (list) => openCount(itemsOf(list)) > 0 && list.touchedAt !== undefined && openedAt - list.touchedAt > WEEK_MS,
  );

  const library = (
    <>
      <GestureList
        key="shelf"
        actions={shelf}
        // By night the shelf is for planning, and says so.
        title={night ? 'The Morrow' : 'Library'}
        // Latin for scrolls; one scroll is a rotulus. By night, Latin for "for tomorrow".
        readout={night ? 'IN CRASTINUM' : `${roman(shelfLists.length)} ${shelfLists.length === 1 ? 'ROTULUS' : 'ROTULI'}`}
        variant="shelf"
        placeholder="New scroll"
        emptyHint="Pull down or tap to add a scroll"
        rows={shelfLists.map((list) => {
          const items = itemsOf(list);
          const open = openCount(items);
          const lines = items.filter((item) => !item.section);
          const sealed = items.length > 0 && open === 0;
          // A scroll made by candlelight for a day to come is marked so on the night's shelf.
          const morrow = !list.tomorrow && list.plannedFor !== undefined && list.plannedFor > today;
          // And one that arrived this morning, or that holds lines which did, is marked NEW for the day.
          const fresh = !list.tomorrow && (list.plannedFor === today || items.some((item) => !item.done && item.plannedFor === today));
          const mark = morrow ? 'MORROW' : fresh ? 'NEW' : null;
          return {
            id: list.id,
            text: list.name,
            note: isTutorial(list) ? 'Tutorial' : undefined,
            progress: lines.length > 0 ? lines.filter((item) => item.done).length / lines.length : undefined,
            badge: mark ? `${mark} · ${roman(open)}` : roman(open),
            badgeMarked: mark !== null,
            sealed: sealed && !morrow,
            stamp: sealed && list.id === freshSeal,
          };
        })}
        subheader={
          <ScribeLine
            standing={spoken(
              night
                ? standing.morrow(address)
                : !greeted
                  ? standing.welcome(address)
                  : dusty
                    ? standing.dust(dusty.name, address)
                    : standing.decree(address),
            )}
          />
        }
        onAdd={(names, index) => {
          say('newScroll');
          // A scroll begun by candlelight is for tomorrow: it joins the day's shelf at dawn.
          store.addLists(names, shelfPosition(index), night ? plannedDay(new Date()) : undefined);
        }}
        // Tomorrow is the scribe's own: it cannot be renamed, cast out or sealed.
        onRename={(id, name) => {
          if (!isTomorrowScroll(id)) store.renameList(id, name);
        }}
        onDelete={(id) => {
          if (isTomorrowScroll(id)) return;
          play('seal');
          say('strike');
          store.deleteList(id);
        }}
        onMove={(from, to) => store.moveList(shelfPosition(from), shelfPosition(to))}
        onOpen={setOpenListId}
        onComplete={(id) => {
          if (isTomorrowScroll(id)) return;
          say('seal');
          pressSeal();
          store.sealList(id);
        }}
      />
      <DeskThings
        scrolls={shelfLists.length}
        onCandle={onCandle}
        night={night}
        onPen={() => {
          tick();
          // With patterns kept, the scribe first asks which sheet to cut. By night a blank one is simply begun.
          if (patterns.length > 0 && !night) {
            setChoosing(true);
            return;
          }
          say('penning');
          shelf.current?.add();
        }}
      />
      <PatternSheet
        open={choosing}
        patterns={patterns}
        onClose={() => setChoosing(false)}
        onForget={(pattern) => forgetPattern(pattern.id)}
        onBlank={() => {
          setChoosing(false);
          say('penning');
          shelf.current?.add();
        }}
        onPattern={(pattern) => {
          setChoosing(false);
          say('fromPattern');
          play('paper');
          store.addListFrom(pattern.name, pattern.lines, pattern.daily);
        }}
      />
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => setSearching(true)} hitSlop={12} accessibilityRole="button">
          <Text style={styles.deskLabel}>Search</Text>
        </Pressable>
        <Pressable onPress={() => setChronicleOpen(true)} hitSlop={12} accessibilityRole="button">
          <Text style={styles.deskLabel}>Chronicle</Text>
        </Pressable>
        <Pressable onPress={() => setChestOpen(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Chest, ${storedLists.length} scrolls`}>
          <Text style={styles.deskLabel}>Chest</Text>
        </Pressable>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} accessibilityRole="button">
          <Text style={styles.deskLabel}>Settings</Text>
        </Pressable>
      </View>
      {/* With a scroll open beside the shelf, the notice and the seal are the scroll's to show. */}
      {scrollPane ? null : <UndoToast undo={store.undo} onUndo={undoLast} onDismiss={store.dismissUndo} offset={44} />}
      {sealing !== null && !scrollPane ? <SealPress key={sealing} onDone={() => setSealing(null)} /> : null}
    </>
  );
  if (!wide) return library;

  return (
    <View style={styles.panes}>
      <PaneWidth.Provider value={shelfWidth}>
        <View style={[styles.pane, { width: shelfWidth }]}>{library}</View>
      </PaneWidth.Provider>
      <PaneWidth.Provider value={Math.min(PAGE_WIDTH, windowWidth - shelfWidth)}>
        <View style={[styles.pane, styles.scrollPane]}>
          {scrollPane ?? (
            <View style={styles.noScroll}>
              <Text style={styles.deskNote}>Choose a scroll from the shelf to unroll it here.</Text>
            </View>
          )}
        </View>
      </PaneWidth.Provider>
    </View>
  );
};

/** The hour the candle is lit when it follows the clock. It is snuffed at dawn, the hour the day's scrolls are laid out. */
const DUSK_HOUR = 19;
const nightByClock = (now: Date) => now.getHours() >= DUSK_HOUR || now.getHours() < DAWN_HOUR;

const columnStyle = { flex: 1, width: '100%', maxWidth: PAGE_WIDTH, alignSelf: 'center' } as const;
/** With the shelf beside it, the desk is as wide as the two together. */
const wideColumnStyle = { ...columnStyle, maxWidth: PAGE_WIDTH + 400 } as const;

export const App: FC = () => {
  const [fontsLoaded] = useFonts({
    PirataOne_400Regular,
    EBGaramond_500Medium,
    EBGaramond_500Medium_Italic,
  });
  const settings = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  // Night is not a paper: it is the candle's side of the desk, drawn in Night Vigil whatever the day's paper.
  const [night, setNight] = useState(false);
  // The hour of the day, which the daylight is drawn by.
  const [hour, setHour] = useState(() => new Date().getHours());
  const palette = useMemo(() => paletteOf(night ? 'vigil' : settings.theme), [night, settings.theme]);
  // The sky being drawn over the desk while the candle turns day to night or back.
  const [turning, setTurning] = useState<'night' | 'day' | null>(null);
  const turnSky = () => {
    if (turning) return;
    tick();
    play('wheel');
    setTurning(night ? 'day' : 'night');
  };

  // The candle follows the hour unless told not to: lit at dusk, snuffed at dawn. Touching it still turns the
  // desk at once, and that choice stands until the hour next crosses dusk or dawn.
  const { loaded: settingsLoaded, followHour } = settings;
  const phase = useRef<boolean | null>(null);
  const nightRef = useRef(night);
  const turningRef = useRef(turning);
  useEffect(() => {
    nightRef.current = night;
    turningRef.current = turning;
  }, [night, turning]);
  useEffect(() => {
    if (!settingsLoaded) return;
    const look = (animate: boolean) => {
      const now = new Date();
      setHour(now.getHours());
      if (!followHour) {
        phase.current = null;
        return;
      }
      const dark = nightByClock(now);
      if (phase.current === dark) return;
      phase.current = dark;
      if (nightRef.current === dark || turningRef.current) return;
      // With the desk in view the sky is drawn turning; coming back to the app, it has simply turned.
      if (animate) {
        play('wheel');
        setTurning(dark ? 'night' : 'day');
      } else setNight(dark);
    };
    look(false);
    const timer = setInterval(() => look(AppState.currentState === 'active'), 30000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') look(false);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [settingsLoaded, followHour]);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.desk }}>
      <SafeAreaProvider>
        <ThemeProvider value={palette}>
          <StatusBar style="light" />
          <Desk night={night} />
          {/* The room's light falls on the desk, beneath the scrolls lying on it: the moon and the candle by night, the sun by day. */}
          {night ? <NightLight /> : <DayLight hour={hour} />}
          {/* On a wide screen the scrolls keep a page's width, centred on the desk, instead of stretching across it. */}
          <View style={windowWidth >= WIDE_AT && settings.address ? wideColumnStyle : columnStyle}>
            {!fontsLoaded || !settings.loaded ? null : settings.address ? (
              <Screens settings={settings} address={settings.address} night={night} onCandle={turnSky} />
            ) : (
              <ScribeWelcome onChoose={settings.chooseAddress} />
            )}
          </View>
          {turning ? (
            <DayNightVeil
              to={turning}
              onCovered={() => {
                // As the moon or sun reaches its place: a bell for night, a rising phrase for day.
                play(turning === 'night' ? 'dusk' : 'dawn');
                setNight((isNight) => !isNight);
              }}
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
  // Wraps onto a second line when a scroll has more to offer than the screen is wide.
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 18, rowGap: 10, paddingHorizontal: 20, paddingTop: 12 },
    // Labels that sit on the desk rather than on paper: the accent is tuned for paper and can be too dark here.
    controlsCentred: { justifyContent: 'center' },
    page: { flex: 1, width: '100%', maxWidth: PAGE_WIDTH, alignSelf: 'center' },
    panes: { flex: 1, flexDirection: 'row' },
    // Each pane keeps what slides about in it to itself.
    pane: { overflow: 'hidden' },
    scrollPane: { flex: 1 },
    noScroll: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    deskNote: { color: colors.onDeskFaded, fontFamily: fonts.bodyItalic, fontSize: 15, textAlign: 'center' },
    deskLabel: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 18, opacity: 0.85 },
    // A label whose setting is on, in gold leaf.
    deskLabelOn: { color: colors.complete, opacity: 1 },
});
