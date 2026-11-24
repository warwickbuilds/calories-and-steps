import { Download } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useUpdateBanner } from '@/lib/updates';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Shown on Today when GitHub has a newer APK than the one installed. */
export function UpdateBanner() {
  const { colors } = useTheme();
  const { update, dismiss } = useUpdateBanner();
  if (!update) return null;

  return (
    <Card accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Download size={20} strokeWidth={1.8} color={colors.text} />
        <View style={styles.text}>
          <Text variant="bodyStrong">Version {update.version} is available</Text>
          <Text variant="caption" muted>
            Download the APK and open it to install. Your data stays in place, but a backup first (Settings) is a good idea.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button variant="ghost" label="Not now" onPress={dismiss} />
        <Button label="Download" onPress={() => Linking.openURL(update.downloadUrl)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  text: { flex: 1, gap: space[1] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
});
