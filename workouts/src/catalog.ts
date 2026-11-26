import type { Category, Equipment, Muscle } from './types';

export type Suggestion = {
  name: string;
  category: Category;
  equipment: Equipment;
  muscles: Muscle[];
  /** One line on how to do it. */
  cue: string;
};

const idea = (
  name: string,
  category: Category,
  equipment: Equipment,
  muscles: Muscle[],
  cue: string,
): Suggestion => ({ name, category, equipment, muscles, cue });

/** Exercises to look up when something is lagging. Not the user's own library. */
export const SUGGESTIONS: Suggestion[] = [
  idea('Cable crossover', 'push', 'centr3', ['chest'], 'Pulleys high, step forward, bring the handles together low in front of you.'),
  idea('Low-to-high cable fly', 'push', 'centr3', ['chest', 'shoulders'], 'Pulleys low, sweep the handles up to meet at chin height.'),
  idea('Tricep pushdown', 'push', 'centr3', ['triceps'], 'Pulley high, elbows pinned to your sides, press the bar to your thighs.'),
  idea('Overhead tricep extension', 'push', 'centr3', ['triceps'], 'Face away from a low pulley, extend the rope overhead without flaring the elbows.'),
  idea('Cable lateral raise', 'push', 'centr3', ['shoulders'], 'Pulley low, raise one arm out to shoulder height, lower slowly.'),
  idea('Smith bar overhead press', 'push', 'centr3', ['shoulders', 'triceps'], 'Bar at collarbone, press straight up, ribs down.'),
  idea('Single-arm cable press', 'push', 'centr3', ['chest', 'abs'], 'Pulley at chest height, staggered stance, press one handle forward without twisting.'),
  idea('Chest dips (lean forward)', 'push', 'dip', ['chest', 'triceps'], 'Lean the torso forward and let the elbows flare a little.'),
  idea('Tricep dips (upright)', 'push', 'dip', ['triceps'], 'Stay upright, elbows tracking back, lock out at the top.'),
  idea('Kettlebell overhead press', 'push', 'kettlebell', ['shoulders', 'triceps'], 'Bell racked on the forearm, press up and slightly back.'),
  idea('Kettlebell floor press', 'push', 'kettlebell', ['chest', 'triceps'], 'Lie on the floor, press until the arm is straight, elbow touches down each rep.'),
  idea('Kettlebell push press', 'push', 'kettlebell', ['shoulders', 'quads'], 'Dip the knees and drive the bell overhead with the legs.'),
  idea('Dumbbell bench press', 'push', 'dumbbell', ['chest', 'triceps'], 'Lower to chest level with forearms vertical, press up and in.'),
  idea('Dumbbell shoulder press', 'push', 'dumbbell', ['shoulders', 'triceps'], 'Start at ear height, press overhead without arching.'),
  idea('Dumbbell lateral raise', 'push', 'dumbbell', ['shoulders'], 'Slight bend in the elbow, raise to shoulder height, no swing.'),
  idea('Push-up', 'push', 'bodyweight', ['chest', 'triceps'], 'Body in one line, chest to the floor, elbows about 45 degrees out.'),

  idea('Face pull', 'pull', 'centr3', ['shoulders', 'back'], 'Rope at face height, pull to your forehead with elbows high.'),
  idea('Single-arm cable row', 'pull', 'centr3', ['back', 'biceps'], 'Pulley at waist height, pull the elbow past your ribs, pause.'),
  idea('Straight-arm pulldown', 'pull', 'centr3', ['back'], 'Arms nearly straight, sweep the bar from eye level to your thighs.'),
  idea('Close-grip pulldown', 'pull', 'centr3', ['back', 'biceps'], 'Narrow handle, pull to the upper chest, lean back slightly.'),
  idea('Cable hammer curl', 'pull', 'centr3', ['biceps'], 'Rope on a low pulley, palms facing each other, curl without moving the elbows.'),
  idea('Smith bar bent-over row', 'pull', 'centr3', ['back', 'biceps'], 'Hinge to about 45 degrees, pull the bar to your belly button.'),
  idea('Pull-up', 'pull', 'centr3', ['back', 'biceps'], 'From a dead hang, pull the chest toward the bar, lower under control.'),
  idea('Cable shrug', 'pull', 'centr3', ['back'], 'Low pulleys, lift the shoulders straight up to the ears, pause.'),
  idea('Kettlebell row', 'pull', 'kettlebell', ['back', 'biceps'], 'Hand on a bench, pull the bell to your hip.'),
  idea('Kettlebell high pull', 'pull', 'kettlebell', ['back', 'shoulders'], 'From a swing, pull the bell toward your shoulder with the elbow high.'),
  idea('Dumbbell row', 'pull', 'dumbbell', ['back', 'biceps'], 'One knee on a bench, flat back, row to the hip.'),
  idea('Dumbbell hammer curl', 'pull', 'dumbbell', ['biceps'], 'Palms in, curl without swinging.'),
  idea('Dumbbell reverse fly', 'pull', 'dumbbell', ['shoulders', 'back'], 'Hinge forward, raise the arms out wide, squeeze the shoulder blades.'),

  idea('Cable pull-through', 'legs', 'centr3', ['glutes', 'hamstrings'], 'Face away from a low pulley, hinge back, then drive the hips forward.'),
  idea('Smith bar Romanian deadlift', 'legs', 'centr3', ['hamstrings', 'glutes'], 'Soft knees, push the hips back until the hamstrings stretch, stand tall.'),
  idea('Smith bar lunge', 'legs', 'centr3', ['quads', 'glutes'], 'Long step, drop the back knee toward the floor, push through the front heel.'),
  idea('Smith bar split squat', 'legs', 'centr3', ['quads', 'glutes'], 'Back foot on a bench, sink straight down, front shin near vertical.'),
  idea('Cable kickback', 'legs', 'centr3', ['glutes'], 'Ankle strap on a low pulley, kick straight back without arching.'),
  idea('Smith bar hip thrust', 'legs', 'centr3', ['glutes', 'hamstrings'], 'Shoulders on a bench, bar over the hips, drive up until the body is flat.'),
  idea('Cable leg curl', 'legs', 'centr3', ['hamstrings'], 'Ankle strap on a low pulley, curl the heel toward your glute.'),
  idea('Goblet squat', 'legs', 'kettlebell', ['quads', 'glutes'], 'Bell at the chest, sit between your heels, elbows inside the knees.'),
  idea('Kettlebell swing', 'legs', 'kettlebell', ['glutes', 'hamstrings', 'back'], 'Hike the bell back, snap the hips, let it float to chest height.'),
  idea('Kettlebell deadlift', 'legs', 'kettlebell', ['hamstrings', 'glutes'], 'Bell between the feet, hinge, stand up by squeezing the glutes.'),
  idea('Dumbbell Romanian deadlift', 'legs', 'dumbbell', ['hamstrings', 'glutes'], 'Slide the dumbbells down the thighs with a flat back.'),
  idea('Dumbbell step-up', 'legs', 'dumbbell', ['quads', 'glutes'], 'Step onto a bench and stand tall, lower slowly on the same leg.'),
  idea('Single-leg calf raise', 'legs', 'bodyweight', ['calves'], 'On a step, full stretch at the bottom, pause at the top.'),

  idea('Cable woodchop', 'core', 'centr3', ['obliques', 'abs'], 'Pulley high, pull diagonally across the body to the opposite hip.'),
  idea('Pallof press', 'core', 'centr3', ['obliques', 'abs'], 'Side-on to the pulley, press the handle straight out and resist the twist.'),
  idea('Kneeling cable crunch', 'core', 'centr3', ['abs'], 'Rope behind the head, curl the ribs toward the hips.'),
  idea('Hanging knee raise', 'core', 'dip', ['abs'], 'Support on the dip handles, raise the knees past hip height.'),
  idea('Kettlebell suitcase carry', 'core', 'kettlebell', ['obliques', 'abs'], 'Walk with one bell at your side without leaning.'),
  idea('Kettlebell Russian twist', 'core', 'kettlebell', ['obliques'], 'Lean back, rotate the bell from hip to hip.'),
  idea('Turkish get-up', 'core', 'kettlebell', ['abs', 'shoulders'], 'Stand up from lying down while keeping the bell locked out overhead.'),
  idea('Dumbbell side bend', 'core', 'dumbbell', ['obliques'], 'One dumbbell at your side, bend sideways and return.'),
  idea('Plank', 'core', 'bodyweight', ['abs'], 'Forearms down, body in one line, squeeze the glutes.'),
];
