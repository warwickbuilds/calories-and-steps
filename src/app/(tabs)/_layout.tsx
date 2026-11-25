import { Tabs } from 'expo-router';
import { Activity, Flame, Footprints, House, Scale, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ColorValue, type PressableProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useRemindersSync } from '@/hooks/reminders';
import { useStepsAutoSync } from '@/hooks/steps';
import { hapticTick } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout } from '@/theme/tokens';

/** The current tab's icon sits in a solid pill (text colour, icon in the background colour). */
function icon(Icon: LucideIcon) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    const { colors } = useTheme();
    return (
      <View style={[styles.pill, focused && { backgroundColor: colors.text }]}>
        <Icon size={20} strokeWidth={focused ? 2.2 : 1.8} color={focused ? colors.bg : String(color)} />
      </View>
    );
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

/** Tab button with no ripple or fade: the pill moving to the new tab and a light haptic tick are the only feedback. */
function TabButton(props: Record<string, unknown>) {
  const { ref: _ref, android_ripple: _ripple, pressColor: _pc, pressOpacity: _po, hoverEffect: _he, onPress, ...rest } = props;
  const press = onPress as PressableProps['onPress'];
  return (
    <Pressable
      {...(rest as PressableProps)}
      onPress={(e) => {
        hapticTick();
        press?.(e);
      }}
    />
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Reads steps from Health Connect on open and whenever the app comes back to the front.
  useStepsAutoSync();
  // Keeps the 7-day local reminder schedule aligned with today's logged meals and weigh-in.
  useRemindersSync();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: (props) => <TabButton {...props} />,
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
      <Tabs.Screen
        name="food"
        options={{ title: 'Calories', tabBarLabel: label('Calories'), tabBarIcon: icon(Flame) }}
      />
      <Tabs.Screen
        name="steps"
        options={{ title: 'Steps', tabBarLabel: label('Steps'), tabBarIcon: icon(Footprints) }}
      />
      <Tabs.Screen name="weight" options={{ title: 'Weight', tabBarLabel: label('Weight'), tabBarIcon: icon(Scale) }} />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarLabel: label('Progress'), tabBarIcon: icon(Activity) }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
