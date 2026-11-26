import type { AppData, Category, Days, Equipment, Exercise, LiftEntry, SetEntry } from './types';

const DEFAULT_REP_TARGET = 9;

const exercise = (id: string, name: string, category: Category, equipment: Equipment = 'centr3'): Exercise => ({
  id,
  name,
  category,
  equipment,
  repTarget: DEFAULT_REP_TARGET,
});

export const SEED_EXERCISES: Exercise[] = [
  exercise('chest-press', 'Chest press', 'push'),
  exercise('bench-press', 'Bench press', 'push'),
  exercise('incline-bench', 'Incline bench', 'push'),
  exercise('chest-fly', 'Chest fly', 'push'),
  exercise('shoulder-press', 'Shoulder press', 'push'),
  exercise('dips', 'Dips', 'push', 'dip'),
  exercise('lat-pulldown', 'Lat pulldown', 'pull'),
  exercise('seated-row', 'Seated row', 'pull'),
  exercise('assisted-pull-up', 'Assisted pull-up', 'pull'),
  exercise('bicep-curl', 'Bicep curl (bar)', 'pull'),
  exercise('rear-delt-fly', 'Rear delt fly', 'pull'),
  exercise('deadlift-row', 'Deadlift row (smith bar)', 'pull'),
  exercise('squat', 'Squat', 'legs'),
  exercise('leg-press', 'Leg press', 'legs'),
  exercise('calf-raise', 'Calf raise', 'legs'),
  exercise('deadlift', 'Deadlift', 'legs'),
  exercise('ab-crunch', 'Ab crunch', 'core'),
  exercise('rotary-torso', 'Rotary torso', 'core'),
];

/** `count` sets of `reps` at one weight. */
const sets = (weight: number | null, reps: number, count: number): SetEntry[] =>
  Array.from({ length: count }, () => ({ weight, reps }));

/**
 * The old note recorded total reps across sets. A multiple of nine is read as
 * sets of nine; anything else is kept as one total, because the split is unknown.
 */
const total = (weight: number | null, reps: number): SetEntry[] =>
  reps % DEFAULT_REP_TARGET === 0
    ? sets(weight, DEFAULT_REP_TARGET, reps / DEFAULT_REP_TARGET)
    : [{ weight, reps, total: true }];

const lift = (exerciseId: string, entrySets: SetEntry[], note?: string): LiftEntry => ({
  exerciseId,
  sets: entrySets,
  ...(note ? { note } : {}),
});

export const SEED_DAYS: Days = {
  '2026-09-21': {
    cardio: [],
    lifts: [
      lift('leg-press', total(200, 25)),
      lift('chest-press', [...total(100, 18), ...sets(110, 8, 1)]),
      lift('rotary-torso', sets(100, 9, 3), 'Each side'),
      lift('seated-row', sets(85, 9, 3)),
      lift('shoulder-press', sets(70, 9, 3)),
      lift('rear-delt-fly', sets(90, 10, 3)),
    ],
  },
  '2026-09-29': {
    cardio: [],
    lifts: [
      lift('squat', total(205, 27)),
      lift('lat-pulldown', total(110, 27)),
      lift('chest-press', total(110, 18)),
      lift('chest-fly', total(100, 27)),
      lift('calf-raise', total(120, 20)),
    ],
  },
  '2026-10-25': {
    cardio: [],
    lifts: [
      lift('chest-fly', total(107.5, 27)),
      lift('squat', total(210, 26)),
      lift('calf-raise', total(140, 21)),
      lift('seated-row', [...sets(100, 6, 1), ...sets(85, 8, 1)], 'Dropped the weight after the first set'),
      lift('chest-press', total(110, 20)),
    ],
  },
  '2026-11-07': {
    cardio: [],
    lifts: [
      lift('lat-pulldown', total(160, 24), 'Plus bar'),
      lift('bicep-curl', total(80, 30)),
      lift('deadlift-row', total(80, 30)),
      lift('squat', total(180, 25)),
      lift('chest-press', [...total(100, 9), ...total(120, 18)]),
      lift('ab-crunch', [...total(90, 9), ...total(100, 20)]),
      lift('rotary-torso', total(80, 15), 'Each side'),
    ],
  },
  '2026-11-09': {
    cardio: [],
    lifts: [
      lift('bicep-curl', total(40, 25)),
      lift('assisted-pull-up', total(null, 26)),
      lift('calf-raise', total(140, 41)),
      lift('squat', total(140, 20)),
      lift('incline-bench', total(80, 20)),
      lift('chest-fly', [...sets(60, 12, 1), ...sets(80, 12, 1)]),
    ],
  },
  '2026-11-16': {
    cardio: [],
    lifts: [
      lift('chest-press', total(140, 24)),
      lift('squat', total(160, 24)),
      lift('calf-raise', total(160, 40)),
      lift('deadlift-row', total(100, 27)),
      lift('ab-crunch', total(120, 40)),
    ],
  },
  '2026-11-20': {
    cardio: [],
    lifts: [
      lift('ab-crunch', total(120, 40)),
      lift('rotary-torso', total(90, 21), 'Each side'),
      lift('lat-pulldown', [...total(160, 9), ...total(180, 14)]),
      lift('dips', total(null, 40)),
      lift('bicep-curl', total(100, 19)),
      lift('chest-press', total(140, 20)),
    ],
  },
  '2026-11-23': {
    cardio: [],
    lifts: [
      lift('bicep-curl', total(100, 27)),
      lift('assisted-pull-up', total(null, 30)),
      lift('squat', total(180, 36), 'Did an extra set by accident'),
      lift('calf-raise', total(180, 45), 'Same weight as the squat'),
      lift('bench-press', total(160, 27)),
    ],
  },
  '2026-11-26': {
    cardio: [],
    lifts: [lift('deadlift', total(120, 18))],
  },
};

export const SEED_DATA: AppData = { exercises: SEED_EXERCISES, days: SEED_DAYS };
