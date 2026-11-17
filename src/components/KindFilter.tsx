import type { FC } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Kind, kinds } from '../kinds';
import { useTheme } from '../ThemeContext';
import { fonts, type Palette } from '../theme';

type KindFilterProps = {
  /** The kinds of scroll now on the shelf. */
  present: Kind[];
  /** The one the shelf is narrowed to, if any. */
  only: Kind | null;
  onOnly: (kind: Kind | null) => void;
};

/**
 * A row of ribbons over the shelf, one for each kind of scroll on it. Touching one leaves only that kind
 * on the shelf; touching it again brings the rest back.
 */
export const KindFilter: FC<KindFilterProps> = ({ present, only, onOnly }) => {
  const { colors, styles } = useTheme(makeStyles);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {present.map((kind) => {
        const chosen = only === kind;
        return (
          <Pressable
            key={kind}
            onPress={() => onOnly(chosen ? null : kind)}
            hitSlop={8}
            style={[styles.chip, only !== null && !chosen && styles.unchosen]}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            accessibilityLabel={chosen ? `Showing only ${kinds[kind].label} scrolls` : `Show only ${kinds[kind].label} scrolls`}
          >
            <View style={[styles.ribbon, { backgroundColor: kinds[kind].ribbon ?? colors.onDesk }]} />
            <Text style={[styles.label, chosen && styles.labelChosen]}>{kinds[kind].label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    strip: { flexGrow: 0, marginTop: 2, marginBottom: 6 },
    row: { paddingHorizontal: 20, gap: 16, alignItems: 'center' },
    chip: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 6 },
    unchosen: { opacity: 0.45 },
    ribbon: { width: 5, height: 16, borderRadius: 1 },
    label: { color: colors.onDesk, fontFamily: fonts.bodyItalic, fontSize: 15, opacity: 0.85 },
    labelChosen: { color: colors.complete, opacity: 1 },
  });
