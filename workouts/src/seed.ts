import { REP_MIN, REP_TARGET, SETS_PER_EXERCISE } from './types';
import type { AppData, Category, Days, Equipment, Exercise, LiftEntry, Muscle, SetEntry } from './types';

const exercise = (
  id: string,
  name: string,
  category: Category,
  muscles: Muscle[],
  equipment: Equipment = 'centr3',
): Exercise => ({ id, name, category, equipment, muscles, repMin: REP_MIN, repTarget: REP_TARGET });

export const SEED_EXERCISES: Exercise[] = [
  exercise('chest-press', 'Chest press', 'push', ['chest', 'triceps']),
  exercise('bench-press', 'Bench press', 'push', ['chest', 'triceps']),
  exercise('incline-bench', 'Incline bench', 'push', ['chest', 'shoulders']),
  exercise('chest-fly', 'Chest fly', 'push', ['chest']),
  exercise('shoulder-press', 'Shoulder press', 'push', ['shoulders', 'triceps']),
  exercise('dips', 'Dips', 'push', ['triceps', 'chest'], 'dip'),
  exercise('lat-pulldown', 'Lat pulldown', 'pull', ['back', 'biceps']),
  exercise('seated-row', 'Seated row', 'pull', ['back', 'biceps']),
  exercise('assisted-pull-up', 'Assisted pull-up', 'pull', ['back', 'biceps']),
  exercise('bicep-curl', 'Bicep curl (bar)', 'pull', ['biceps']),
  exercise('rear-delt-fly', 'Rear delt fly', 'pull', ['shoulders', 'back']),
  exercise('deadlift-row', 'Deadlift row (smith bar)', 'pull', ['back', 'hamstrings']),
  exercise('squat', 'Squat', 'legs', ['quads', 'glutes']),
  exercise('leg-press', 'Leg press', 'legs', ['quads', 'glutes']),
  exercise('calf-raise', 'Calf raise', 'legs', ['calves']),
  exercise('deadlift', 'Deadlift', 'legs', ['hamstrings', 'glutes', 'back']),
  exercise('ab-crunch', 'Ab crunch', 'core', ['abs']),
  exercise('rotary-torso', 'Rotary torso', 'core', ['obliques']),
];

/** `count` sets of `reps` at one weight. */
const sets = (weight: number | null, reps: number, count: number): SetEntry[] =>
  Array.from({ length: count }, () => ({ weight, reps }));

/**
 * The old note recorded one rep total per weight. A total that three sets of
 * six to nine could produce is spread evenly over three sets, which is an
 * estimate of the real split.
 */
const spread = (weight: number | null, reps: number): SetEntry[] => {
  const base = Math.floor(reps / SETS_PER_EXERCISE);
  const extra = reps % SETS_PER_EXERCISE;
  return Array.from({ length: SETS_PER_EXERCISE }, (_, index) => ({ weight, reps: base + (index < extra ? 1 : 0) }));
};

/** A total with no sensible three-set split; kept as written. */
const lump = (weight: number | null, reps: number): SetEntry[] => [{ weight, reps, total: true }];

const lift = (exerciseId: string, entrySets: SetEntry[], note?: string): LiftEntry => ({
  exerciseId,
  sets: entrySets,
  ...(note ? { note } : {}),
});

export const SEED_DAYS: Days = {
  '2026-09-21': {
    cardio: [],
    lifts: [
      lift('leg-press', spread(200, 25)),
      lift('chest-press', [...sets(100, 9, 2), ...sets(110, 8, 1)]),
      lift('rotary-torso', sets(100, 9, 3), 'Each side'),
      lift('seated-row', sets(85, 9, 3)),
      lift('shoulder-press', sets(70, 9, 3)),
      lift('rear-delt-fly', sets(90, 10, 3)),
    ],
  },
  '2026-09-29': {
    cardio: [],
    lifts: [
      lift('squat', spread(205, 27)),
      lift('lat-pulldown', spread(110, 27)),
      lift('chest-press', spread(110, 18)),
      lift('chest-fly', spread(100, 27)),
      lift('calf-raise', spread(120, 20)),
    ],
  },
  '2026-10-25': {
    cardio: [],
    lifts: [
      lift('chest-fly', spread(107.5, 27)),
      lift('squat', spread(210, 26)),
      lift('calf-raise', spread(140, 21)),
      lift('seated-row', [...sets(100, 6, 1), ...sets(85, 8, 1)], 'Dropped the weight after the first set'),
      lift('chest-press', spread(110, 20)),
    ],
  },
  '2026-11-07': {
    cardio: [],
    lifts: [
      lift('lat-pulldown', spread(160, 24), 'Plus bar'),
      lift('bicep-curl', spread(80, 30)),
      lift('deadlift-row', spread(80, 30)),
      lift('squat', spread(180, 25)),
      lift('chest-press', [...sets(100, 9, 1), ...sets(120, 9, 2)]),
      lift('ab-crunch', [...sets(90, 9, 1), ...sets(100, 10, 2)]),
      lift('rotary-torso', lump(80, 15), 'Each side'),
    ],
  },
  '2026-11-09': {
    cardio: [],
    lifts: [
      lift('bicep-curl', spread(40, 25)),
      lift('assisted-pull-up', spread(null, 26)),
      lift('calf-raise', lump(140, 41)),
      lift('squat', spread(140, 20)),
      lift('incline-bench', spread(80, 20)),
      lift('chest-fly', [...sets(60, 12, 1), ...sets(80, 12, 1)]),
    ],
  },
  '2026-11-16': {
    cardio: [],
    lifts: [
      lift('chest-press', spread(140, 24)),
      lift('squat', spread(160, 24)),
      lift('calf-raise', lump(160, 40)),
      lift('deadlift-row', spread(100, 27)),
      lift('ab-crunch', lump(120, 40)),
    ],
  },
  '2026-11-20': {
    cardio: [],
    lifts: [
      lift('ab-crunch', lump(120, 40)),
      lift('rotary-torso', spread(90, 21), 'Each side'),
      lift('lat-pulldown', [...sets(160, 9, 1), ...sets(180, 7, 2)]),
      lift('dips', lump(null, 40)),
      lift('bicep-curl', spread(100, 19)),
      lift('chest-press', spread(140, 20)),
    ],
  },
  '2026-11-23': {
    cardio: [],
    lifts: [
      lift('bicep-curl', spread(100, 27)),
      lift('assisted-pull-up', spread(null, 30)),
      lift('squat', sets(180, 9, 4), 'Did an extra set by accident'),
      lift('calf-raise', lump(180, 45), 'Same weight as the squat'),
      lift('bench-press', spread(160, 27)),
    ],
  },
  '2026-11-26': {
    cardio: [],
    lifts: [lift('deadlift', spread(120, 18))],
  },
};

export const SEED_DATA: AppData = { exercises: SEED_EXERCISES, days: SEED_DAYS };
