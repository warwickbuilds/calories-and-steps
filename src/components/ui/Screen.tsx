import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

import { Text } from './Text';

/** Space kept between the focused field and the top of the keyboard (or the footer riding on it). */
const KEYBOARD_GAP = space[6];

/**
 * A scrolling screen with the standard 20 side padding and 14 between cards.
 *
 * Keyboard handling (both platforms, edge-to-edge Android included): the scroll view moves the
 * focused field up so it sits just above the keyboard, and the footer (Save/Next buttons) rides
 * on top of the keyboard instead of being hidden behind it.
 */
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
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  // The footer's resting place is above the bottom safe area and its own bottom padding; with the
  // keyboard up neither is needed, so drop it most of that way to sit snugly on the keyboard.
  const bottomInset = edges.includes('bottom') ? insets.bottom : 0;
  const footerOpened = bottomInset + space[6] - space[3];
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bottomOffset={KEYBOARD_GAP + (footer ? footerHeight : 0)}>
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
        </KeyboardAwareScrollView>
        {footer ? (
          <KeyboardStickyView offset={{ closed: 0, opened: footerOpened }}>
            <View
              style={[styles.footer, { backgroundColor: colors.bg }]}
              onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
              {footer}
            </View>
          </KeyboardStickyView>
        ) : null}
      </View>
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
