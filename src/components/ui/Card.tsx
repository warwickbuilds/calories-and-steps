import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

import { Text } from './Text';

/** Surface card: radius 24 with a crisp hairline border and whisper-quiet light-mode depth. */
export function Card({
  title,
  right,
  style,
  children,
  ...rest
}: PropsWithChildren<{ title?: string; right?: ReactNode; style?: StyleProp<ViewStyle> } & ViewProps>) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.cardBorder },
        scheme === 'light' && styles.lightElevation,
        style,
      ]}
      {...rest}>
      {title ? (
        <View style={styles.header}>
          <Text variant="title">{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    padding: layout.cardPadding,
    gap: space[3],
  },
  lightElevation: {
    shadowColor: '#0E1111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
