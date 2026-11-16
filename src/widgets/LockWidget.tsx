// Lock screen widget: what is left on the scroll, at a glance, in the three shapes the Lock Screen allows.
//
// Like ScrollWidget it runs outside the app in its own bundle: only @expo/ui/swift-ui components and
// modifiers, no hooks, and nothing from module scope. The system draws Lock Screen widgets in its
// own single tone, so no colours are passed.

import { Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

export type LockWidgetProps = {
  /** Name of the scroll shown, or '' when there is none. */
  title: string;
  /** The first few unfinished items on it. */
  items: string[];
  /** How many are unfinished in total. */
  remaining: number;
};

export const LOCK_WIDGET_NAME = 'ScrollLock';

const LockWidget = (props: LockWidgetProps, environment: { widgetFamily?: string }) => {
  'widget';

  const family = environment.widgetFamily ?? 'accessoryRectangular';
  const link = 'decree://scroll';
  const items = props.items ?? [];
  const title = props.title && props.title.length > 0 ? props.title : 'Decree';
  const remaining = props.remaining ?? 0;
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

  if (family === 'accessoryInline') {
    // One line beside the date: the scroll and how much is left on it.
    return (
      <Text modifiers={[containerBackground('#00000000', 'widget'), widgetURL(link)]}>
        {remaining > 0 ? `${title}: ${roman(remaining)} left` : `${title}: all done`}
      </Text>
    );
  }

  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0} modifiers={[containerBackground('#00000000', 'widget'), widgetURL(link)]}>
        <Text modifiers={[font({ size: remaining > 99 ? 13 : 18, weight: 'bold', design: 'serif' }), lineLimit(1)]}>
          {remaining > 0 ? roman(remaining) : 'FINIS'}
        </Text>
        {remaining > 0 ? <Text modifiers={[font({ size: 9, weight: 'medium', design: 'serif' })]}>RES</Text> : null}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={1} modifiers={[containerBackground('#00000000', 'widget'), widgetURL(link)]}>
      <Text modifiers={[font({ size: 14, weight: 'bold', design: 'serif' }), lineLimit(1)]}>
        {remaining > 0 ? `${title}  ${roman(remaining)}` : title}
      </Text>
      {items.length === 0 ? (
        <Text modifiers={[font({ size: 12, design: 'serif' }), lineLimit(1)]}>All is done.</Text>
      ) : (
        items.slice(0, 2).map((text, index) => (
          <Text key={`${index}-${text}`} modifiers={[font({ size: 12, design: 'serif' }), lineLimit(1)]}>
            {text}
          </Text>
        ))
      )}
    </VStack>
  );
};

const initialProps: LockWidgetProps = { title: '', items: [], remaining: 0 };

export default createWidget<LockWidgetProps>(LOCK_WIDGET_NAME, LockWidget, initialProps);
