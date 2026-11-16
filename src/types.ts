export type Item = {
  id: string;
  text: string;
  done: boolean;
  /** A heading that groups the items below it, up to the next heading. Never `done`. */
  section?: boolean;
  /** On a section: its items are folded away. */
  collapsed?: boolean;
};

export type List = {
  id: string;
  name: string;
  items: Item[];
};
