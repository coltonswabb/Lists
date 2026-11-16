export type Item = {
  id: string;
  text: string;
  done: boolean;
  /** A heading that groups the items below it, up to the next heading. Never `done`. */
  section?: boolean;
};

export type List = {
  id: string;
  name: string;
  items: Item[];
};
