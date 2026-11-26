import { addDays } from './dates';
import type { Category, Days, Exercise, LiftEntry, SetEntry } from './types';

export type Trend = 'up' | 'down' | 'same' | 'first';

/** Where a set's reps fall in the exercise's range, and so what to do with the weight. */
export type Zone = 'raise' | 'solid' | 'heavy' | 'drop';

export type Verdict = {
  trend: Trend;
  /** What the session says about the weight for next time. */
  call: Zone;
  detail: string;
};

export type Previous = {
  date: string;
  entry: LiftEntry;
};

const logged = (sets: SetEntry[]): SetEntry[] => sets.filter((set) => set.reps !== null && set.reps > 0);

const topWeight = (sets: SetEntry[]): number => Math.max(0, ...sets.map((set) => set.weight ?? 0));

const repsAt = (sets: SetEntry[], weight: number): number =>
  sets.filter((set) => (set.weight ?? 0) === weight).reduce((sum, set) => sum + (set.reps ?? 0), 0);

export const isLogged = (entry: LiftEntry): boolean => logged(entry.sets).length > 0;

/** The most recent session of an exercise before `date`. */
export const findPrevious = (days: Days, exerciseId: string, date: string): Previous | null => {
  const earlier = Object.keys(days)
    .filter((key) => key < date)
    .sort()
    .reverse();
  for (const key of earlier) {
    const entry = days[key]?.lifts.find((lift) => lift.exerciseId === exerciseId && isLogged(lift));
    if (entry) return { date: key, entry };
  }
  return null;
};

type Range = Pick<Exercise, 'repMin' | 'repTarget'>;

export const zoneOf = (reps: number, { repMin, repTarget }: Range): Zone => {
  if (reps >= repTarget) return 'raise';
  if (reps > repMin) return 'solid';
  return reps === repMin ? 'heavy' : 'drop';
};

/** One set at the target is enough to go up; otherwise the weakest set decides. */
export const callFor = (entry: LiftEntry, range: Range): Zone | null => {
  const zones = logged(entry.sets)
    .filter((set) => !set.total)
    .map((set) => zoneOf(set.reps ?? 0, range));
  if (zones.length === 0) return null;
  if (zones.includes('raise')) return 'raise';
  if (zones.includes('drop')) return 'drop';
  return zones.includes('heavy') ? 'heavy' : 'solid';
};

export const CALL_TEXT: Record<Zone, string> = {
  raise: 'Go heavier next time',
  solid: 'On track — same weight',
  heavy: 'Heavy — hold this weight',
  drop: 'Too heavy — drop the weight',
};

/** The heaviest weight ever logged for an exercise. */
export const bestWeight = (days: Days, exerciseId: string): number =>
  Math.max(
    0,
    ...Object.values(days).flatMap((day) =>
      day.lifts.filter((lift) => lift.exerciseId === exerciseId).map((lift) => topWeight(logged(lift.sets))),
    ),
  );

/** Every logged session of an exercise, newest first. */
export const historyOf = (days: Days, exerciseId: string): Previous[] =>
  Object.keys(days)
    .sort()
    .reverse()
    .flatMap((date) =>
      (days[date]?.lifts ?? [])
        .filter((lift) => lift.exerciseId === exerciseId && isLogged(lift))
        .map((entry) => ({ date, entry })),
    );

const formatWeight = (weight: number): string => (weight > 0 ? `${weight} lb` : 'bodyweight');

export const judge = (entry: LiftEntry, previous: Previous | null, exercise: Exercise): Verdict | null => {
  const current = logged(entry.sets);
  if (current.length === 0) return null;
  const call = callFor(entry, exercise) ?? 'solid';
  if (!previous) return { trend: 'first', call, detail: 'First time logged' };

  const before = logged(previous.entry.sets);
  const weightNow = topWeight(current);
  const weightBefore = topWeight(before);
  if (weightNow !== weightBefore) {
    return {
      trend: weightNow > weightBefore ? 'up' : 'down',
      call,
      detail: `${formatWeight(weightBefore)} → ${formatWeight(weightNow)}`,
    };
  }
  const repsNow = repsAt(current, weightNow);
  const repsBefore = repsAt(before, weightBefore);
  if (repsNow === repsBefore) return { trend: 'same', call, detail: `Same as last time (${repsNow} reps)` };
  return {
    trend: repsNow > repsBefore ? 'up' : 'down',
    call,
    detail: `${repsBefore} → ${repsNow} reps at ${formatWeight(weightNow)}`,
  };
};

export const summarizeSets = (sets: SetEntry[]): string => {
  const done = logged(sets);
  if (done.length === 0) return 'Nothing logged';
  const groups: { weight: number | null; reps: number[]; total: boolean }[] = [];
  for (const set of done) {
    const last = groups[groups.length - 1];
    if (last && last.weight === set.weight && !last.total && !set.total) last.reps.push(set.reps ?? 0);
    else groups.push({ weight: set.weight, reps: [set.reps ?? 0], total: Boolean(set.total) });
  }
  return groups
    .map((group) => {
      const weight = group.weight === null ? '' : `${group.weight} lb × `;
      const reps = group.total ? `${group.reps[0]} total` : group.reps.join(', ');
      return `${weight}${reps}`;
    })
    .join('  ·  ');
};

/** Sets logged per category over the seven days ending on `endDate`. */
export const weeklySets = (days: Days, exercises: Exercise[], endDate: string): Record<Category, number> => {
  const categoryOf = new Map(exercises.map((item) => [item.id, item.category]));
  const counts: Record<Category, number> = { push: 0, pull: 0, legs: 0, core: 0 };
  for (let offset = 0; offset < 7; offset += 1) {
    const day = days[addDays(endDate, -offset)];
    for (const lift of day?.lifts ?? []) {
      const category = categoryOf.get(lift.exerciseId);
      if (category) counts[category] += logged(lift.sets).length;
    }
  }
  return counts;
};

export const dayCategories = (days: Days, exercises: Exercise[], date: string): Category[] => {
  const categoryOf = new Map(exercises.map((item) => [item.id, item.category]));
  const found = new Set<Category>();
  for (const lift of days[date]?.lifts ?? []) {
    const category = categoryOf.get(lift.exerciseId);
    if (category) found.add(category);
  }
  return [...found];
};
