export type Item = {
  id: string;
  text: string;
  done: boolean;
  /** A heading that groups the items below it, up to the next heading. Never `done`. */
  section?: boolean;
  /** On a section: its items are folded away. */
  collapsed?: boolean;
  /** When the scribe should remind the user of this item, as a timestamp. */
  remindAt?: number;
  /** The reminder comes round again: every day at this time, or every week on this weekday (0 = Sunday). */
  repeat?: Repeat;
};

/** When a repeating reminder falls. Without a weekday it is every day. */
export type Repeat = { hour: number; minute: number; weekday?: number };

export type List = {
  id: string;
  name: string;
  items: Item[];
  /** When the scroll was last changed, so the scribe can notice one gathering dust. */
  touchedAt?: number;
  /** A reusable scroll: every item is unmarked again each dawn. */
  daily?: boolean;
  /** The day (YYYY-MM-DD, local) a daily scroll was last renewed. */
  renewedOn?: string;
  /** The one scroll written by candlelight for the day to come. It is kept off the shelf. */
  tomorrow?: boolean;
  /** On the Tomorrow scroll: the day (YYYY-MM-DD, local) it is being planned for. */
  plannedFor?: string;
};

/** A scroll taken off the shelf and kept in the chronicle. */
export type SealedList = List & { sealedAt: number };

/** One line of the chronicle: an item struck done, or a scroll sealed. */
export type ChronicleEntry = {
  id: string;
  at: number;
  kind: 'done' | 'sealed';
  /** The item's text, or for a sealed scroll its name. */
  text: string;
  /** The scroll it happened on. */
  scroll: string;
  /** For a struck item, so unmarking it can take the entry back. */
  itemId?: string;
};
