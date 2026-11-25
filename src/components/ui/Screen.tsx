import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

import { Text } from './Text';

/** A scrolling screen with the standard 20 side padding and 14 between cards. */
export function Screen({
  title,
  eyebrow,
  right,
  footer,
  edges = ['top'],
  children,
}: PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  footer?: ReactNode;
  edges?: Edge[];
}>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {eyebrow ? (
                  <Text variant="eyebrow" muted>
                    {eyebrow}
                  </Text>
                ) : null}
                <Text variant="display" accessibilityRole="header">
                  {title}
                </Text>
              </View>
              {right}
            </View>
          ) : null}
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: space[7], gap: layout.cardGap },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[3],
    paddingBottom: space[1],
  },
  headerText: { flex: 1 },
  footer: { paddingHorizontal: layout.screenPadding, paddingBottom: space[6], paddingTop: space[2] },
});
