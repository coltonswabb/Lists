export type Category = 'push' | 'pull' | 'legs' | 'core';

export type Equipment = 'centr3' | 'dip' | 'kettlebell' | 'dumbbell' | 'bodyweight';

export type Exercise = {
  id: string;
  name: string;
  category: Category;
  equipment: Equipment;
  /** Reps in one set that mean the weight is too light. */
  repTarget: number;
};

export type SetEntry = {
  /** null means bodyweight or not recorded. */
  weight: number | null;
  reps: number | null;
  /** Imported from the old note, where reps were a total across all sets. */
  total?: boolean;
};

export type LiftEntry = {
  exerciseId: string;
  sets: SetEntry[];
  note?: string;
};

export type CardioEntry = {
  id: string;
  kind: string;
  minutes: number;
};

export type Day = {
  lifts: LiftEntry[];
  cardio: CardioEntry[];
};

/** Keyed by local date, YYYY-MM-DD. */
export type Days = Record<string, Day>;

export type AppData = {
  exercises: Exercise[];
  days: Days;
};

export const CATEGORIES: readonly Category[] = ['push', 'pull', 'legs', 'core'];

export const CATEGORY_LABEL: Record<Category, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
};

export const EQUIPMENT: readonly Equipment[] = ['centr3', 'dip', 'kettlebell', 'dumbbell', 'bodyweight'];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  centr3: 'Centr 3',
  dip: 'Dip machine',
  kettlebell: 'Kettlebell',
  dumbbell: 'Dumbbell',
  bodyweight: 'Bodyweight',
};
