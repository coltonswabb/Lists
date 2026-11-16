// Home screen widget: one scroll and what is left on it.
//
// Rendered by WidgetKit through expo-widgets. The layout function is compiled into its own bundle and
// runs outside the app, so it may use only @expo/ui/swift-ui components and modifiers, no hooks, no
// async work and nothing from module scope: everything it needs arrives in `props`, pushed from the
// app by src/widgetSync.ts.

import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, containerBackground, font, foregroundStyle, lineLimit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

export type ScrollWidgetProps = {
  /** Name of the scroll shown, or '' when there is nothing to show. */
  title: string;
  /** Unfinished items on that scroll, in order, capped by the sender. */
  items: string[];
  /** The id of each item in `items`, in the same order, so one struck on the widget can be struck in the app. */
  ids?: string[];
  /** Ids struck on the widget itself since the app last looked. The app strikes them and empties this. */
  struck?: string[];
  /** How many are unfinished in total, which may be more than `items` holds. */
  remaining: number;
  /** What the scribe says when the scroll is finished or absent. */
  note: string;
  paper: string;
  ink: string;
  faded: string;
  accent: string;
};

export const WIDGET_NAME = 'ListsScroll';

const ScrollWidget = (props: ScrollWidgetProps, environment: { widgetFamily?: string }) => {
  'widget';

  const family = environment.widgetFamily ?? 'systemSmall';
  const link = 'decree://scroll';
  const items = props.items ?? [];
  const ids = props.ids ?? [];
  // The small widget is one tap target that opens the app; the larger ones have room for a button per line.
  const canStrike = family !== 'systemSmall' && ids.length === items.length;
  const shown = items.slice(0, family === 'systemLarge' ? 9 : family === 'systemMedium' ? 3 : 4);
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const more = (props.remaining ?? 0) - shown.length;
  // Counted in numerals, as in the app. Defined here because a widget may use nothing from module scope.
  const roman = (count: number) => {
    if (count <= 0) return 'NIL';
    const marks: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let left = count;
    let out = '';
    for (const [value, mark] of marks) {
      while (left >= value) {
        out += mark;
        left -= value;
      }
    }
    return out;
  };

  return (
    <VStack
      alignment="leading"
      spacing={5}
      modifiers={[containerBackground(props.paper, 'widget'), widgetURL(link), padding({ all: 2 })]}
    >
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 16, weight: 'bold', design: 'serif' }), foregroundStyle(props.ink), lineLimit(1)]}>
          {props.title && props.title.length > 0 ? props.title : 'Library'}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'medium', design: 'serif' }), foregroundStyle(props.faded)]}>
          {roman(props.remaining ?? 0)}
        </Text>
      </HStack>
      {shown.length === 0 ? (
        <Text modifiers={[font({ size: 14, design: 'serif' }), foregroundStyle(props.faded)]}>{props.note}</Text>
      ) : (
        shown.map((text, index) => (
          <HStack key={`${index}-${text}`} spacing={8}>
            {canStrike && ids[index] ? (
              // Pressing the numeral strikes the item here and now, without opening the app. What it
              // returns becomes the widget's new props; the app finds the id in `struck` when it next looks.
              <Button
                target={`strike-${index}`}
                modifiers={[buttonStyle('plain')]}
                onPress={() => ({
                  ...props,
                  items: items.filter((_, at) => at !== index),
                  ids: ids.filter((_, at) => at !== index),
                  remaining: Math.max(0, (props.remaining ?? 0) - 1),
                  struck: [...(props.struck ?? []), ids[index]],
                })}
              >
                <Text modifiers={[font({ size: 10, weight: 'medium', design: 'serif' }), foregroundStyle(props.accent)]}>
                  {numerals[index] ?? ''}
                </Text>
              </Button>
            ) : (
              <Text modifiers={[font({ size: 10, weight: 'medium', design: 'serif' }), foregroundStyle(props.accent)]}>
                {numerals[index] ?? ''}
              </Text>
            )}
            <Text modifiers={[font({ size: 14, design: 'serif' }), foregroundStyle(props.ink), lineLimit(1)]}>{text}</Text>
            <Spacer />
          </HStack>
        ))
      )}
      {more > 0 ? (
        <Text modifiers={[font({ size: 11, design: 'serif' }), foregroundStyle(props.faded)]}>{`and ${roman(more)} more`}</Text>
      ) : null}
      <Spacer />
    </VStack>
  );
};

const initialProps: ScrollWidgetProps = {
  title: '',
  items: [],
  remaining: 0,
  note: 'Open the app to begin a scroll.',
  paper: '#f5e9c9',
  ink: '#23201c',
  faded: '#8a8172',
  accent: '#bf3418',
};

export default createWidget<ScrollWidgetProps>(WIDGET_NAME, ScrollWidget, initialProps);
