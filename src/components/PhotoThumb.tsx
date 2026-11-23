import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { photoUri } from '@/lib/photos';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** A stored photo (relative path) or a captured one (uri), with an empty placeholder. */
export function PhotoThumb({
  path,
  uri,
  style,
  accessibilityLabel,
}: {
  path?: string | null;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const source = uri ?? (path ? photoUri(path) : null);
  return (
    <View
      style={[styles.box, { backgroundColor: colors.track }, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={source ? 'image' : undefined}>
      {source ? (
        <Image source={{ uri: source }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Camera size={20} strokeWidth={1.8} color={colors.muted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', aspectRatio: 3 / 4 },
});
