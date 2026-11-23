import { Tabs } from 'expo-router';
import { Activity, House, Scale, Utensils, type LucideIcon } from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout } from '@/theme/tokens';

function icon(Icon: LucideIcon) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon size={22} strokeWidth={1.8} color={String(color)} />;
  };
}

/** Active tab label is text-coloured semibold; the others are muted. */
function label(title: string) {
  return function TabLabel({ focused, color }: { focused: boolean; color: ColorValue }) {
    return (
      <Text
        variant="caption"
        color={String(color)}
        style={{ fontFamily: focused ? fonts.semibold : fonts.regular }}>
        {title}
      </Text>
    );
  };
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: layout.tabBarHeight + insets.bottom,
          paddingTop: 8,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarLabel: label('Today'), tabBarIcon: icon(House) }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarLabel: label('Food'), tabBarIcon: icon(Utensils) }} />
      <Tabs.Screen name="weight" options={{ title: 'Weight', tabBarLabel: label('Weight'), tabBarIcon: icon(Scale) }} />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarLabel: label('Progress'), tabBarIcon: icon(Activity) }}
      />
    </Tabs>
  );
}
