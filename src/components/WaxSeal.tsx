import type { FC } from 'react';
import { Image, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { blankSeal, waxSeal } from '../art';
import { getSealInitial } from '../settings';
import { fonts } from '../theme';

/** On the blank seal's painting: the middle of the empty field under the crown, and how wide it is. */
const FIELD = { x: 0.485, y: 0.617, width: 0.38 };

type WaxSealProps = {
  /** The seal's width in points. */
  size: number;
  style?: StyleProp<ViewStyle>;
};

/** Whether there is a painted seal to show at all. Without one, callers draw their own plain mark. */
export const hasWaxSeal = waxSeal !== undefined;

/**
 * The wax seal. With an initial chosen in Settings it is the blank seal with that letter pressed
 * into the field under its crown; otherwise the scribe's own seal as painted. Decorative only.
 */
export const WaxSeal: FC<WaxSealProps> = ({ size, style }) => {
  const initial = getSealInitial();
  if (initial && blankSeal) {
    const height = (size * blankSeal.height) / blankSeal.width;
    const field = size * FIELD.width;
    return (
      <View style={[{ width: size, height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={blankSeal.source} style={{ width: size, height }} />
        <View style={[styles.field, { left: size * FIELD.x - field / 2, top: height * FIELD.y - field / 2, width: field, height: field }]}>
          {/* Dark in the hollow with a lighter lip below it, as a letter pressed into wax catches the light. */}
          <Text
            allowFontScaling={false}
            style={[styles.letter, { fontSize: field * 0.86, lineHeight: field * 1.02, textShadowOffset: { width: 0, height: Math.max(0.5, size / 90) } }]}
          >
            {initial}
          </Text>
        </View>
      </View>
    );
  }
  if (!waxSeal) return null;
  const height = (size * waxSeal.height) / waxSeal.width;
  return (
    <View style={[{ width: size, height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={waxSeal.source} style={{ width: size, height }} />
    </View>
  );
};

const styles = StyleSheet.create({
  field: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  letter: {
    fontFamily: fonts.display,
    color: '#5a0d0b',
    textAlign: 'center',
    textShadowColor: 'rgba(255,150,130,0.55)',
    textShadowRadius: 0.5,
  },
});
