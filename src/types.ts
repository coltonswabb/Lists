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
};

export type List = {
  id: string;
  name: string;
  items: Item[];
  /** When the scroll was last changed, so the scribe can notice one gathering dust. */
  touchedAt?: number;
};
