import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

import { Text } from './Text';

/** Surface card: radius 24, no shadow, no border. */
export function Card({
  title,
  right,
  style,
  children,
  ...rest
}: PropsWithChildren<{ title?: string; right?: ReactNode; style?: StyleProp<ViewStyle> } & ViewProps>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]} {...rest}>
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
  card: { borderRadius: layout.cardRadius, padding: layout.cardPadding, gap: space[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
