export type Category = 'push' | 'pull' | 'legs' | 'core';

export type Equipment = 'centr3' | 'dip' | 'kettlebell' | 'dumbbell' | 'bodyweight';

export type Muscle =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'obliques';

export type Exercise = {
  id: string;
  name: string;
  category: Category;
  equipment: Equipment;
  muscles: Muscle[];
  /** Reps in a set that mean the weight is heavy: hold here. Fewer means too heavy. */
  repMin: number;
  /** Reps in a set that mean the weight is too light: go up. */
  repTarget: number;
};

export type SetEntry = {
  /** null means bodyweight or not recorded. */
  weight: number | null;
  reps: number | null;
  /** Imported from the old note as a total across sets whose split is unknown. */
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

export const REP_MIN = 6;
export const REP_TARGET = 9;
export const SETS_PER_EXERCISE = 3;

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

export const MUSCLES: readonly Muscle[] = [
  'chest',
  'shoulders',
  'triceps',
  'back',
  'biceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  back: 'Back',
  biceps: 'Biceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
};
