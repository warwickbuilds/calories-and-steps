import {
  Apple,
  Carrot,
  CookingPot,
  Cookie,
  CupSoda,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  Milk,
  Utensils,
  Wheat,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { categoryFor, type FoodCategory } from '@/lib/foodCategory';
import { useTheme } from '@/theme/ThemeProvider';

export const CATEGORY_ICONS: Record<FoodCategory, LucideIcon> = {
  dairy: Milk,
  meat: Drumstick,
  fish: Fish,
  eggs: Egg,
  grains: Wheat,
  fruit: Apple,
  veg: Carrot,
  sauce: Droplet,
  snack: Cookie,
  drink: CupSoda,
  meal: CookingPot,
  other: Utensils,
};

/**
 * A small, neutral line icon for a food's category, in a soft circle.
 * Never green or orange: those colours belong to steps and calories.
 */
export function FoodIcon({
  food,
  size = 32,
}: {
  food: { category?: string | null; name?: string | null };
  size?: number;
}) {
  const { colors } = useTheme();
  const Icon = CATEGORY_ICONS[categoryFor(food)];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.track }]}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.8} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
