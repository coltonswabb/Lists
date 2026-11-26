import type { Category, Equipment } from './types';

export type Suggestion = {
  name: string;
  category: Category;
  equipment: Equipment;
};

const suggest = (category: Category, equipment: Equipment, names: string[]): Suggestion[] =>
  names.map((name) => ({ name, category, equipment }));

/** Ideas to pull from when a category is lagging. Not the user's own library. */
export const SUGGESTIONS: Suggestion[] = [
  ...suggest('push', 'centr3', [
    'Cable crossover',
    'Low-to-high cable fly',
    'Tricep pushdown',
    'Overhead tricep extension',
    'Cable lateral raise',
    'Smith bar overhead press',
  ]),
  ...suggest('push', 'dip', ['Chest dips (lean forward)', 'Tricep dips (upright)']),
  ...suggest('push', 'kettlebell', ['Kettlebell overhead press', 'Kettlebell floor press', 'Kettlebell push press']),
  ...suggest('push', 'dumbbell', ['Dumbbell bench press', 'Dumbbell shoulder press', 'Dumbbell lateral raise']),
  ...suggest('pull', 'centr3', [
    'Face pull',
    'Single-arm cable row',
    'Straight-arm pulldown',
    'Cable hammer curl',
    'Close-grip pulldown',
    'Pull-up',
  ]),
  ...suggest('pull', 'kettlebell', ['Kettlebell row', 'Kettlebell high pull', 'Kettlebell swing']),
  ...suggest('pull', 'dumbbell', ['Dumbbell row', 'Dumbbell hammer curl', 'Dumbbell reverse fly']),
  ...suggest('legs', 'centr3', [
    'Cable pull-through',
    'Smith bar lunge',
    'Smith bar Romanian deadlift',
    'Cable kickback',
    'Smith bar split squat',
  ]),
  ...suggest('legs', 'kettlebell', ['Goblet squat', 'Kettlebell deadlift', 'Kettlebell lunge']),
  ...suggest('legs', 'dumbbell', ['Dumbbell Romanian deadlift', 'Dumbbell step-up', 'Dumbbell split squat']),
  ...suggest('core', 'centr3', ['Cable woodchop', 'Pallof press', 'Kneeling cable crunch']),
  ...suggest('core', 'dip', ['Hanging knee raise']),
  ...suggest('core', 'kettlebell', ['Kettlebell Russian twist', 'Kettlebell suitcase carry', 'Turkish get-up']),
  ...suggest('core', 'dumbbell', ['Dumbbell side bend', 'Weighted sit-up']),
];
