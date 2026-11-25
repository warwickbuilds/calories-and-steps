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
import { softTint, type Palette } from '@/theme/colors';
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

/** Subtle category tint from the app's non-green, non-orange hues (blue, violet, gold, berry, neutral). */
function categoryTint(category: FoodCategory, colors: Palette): { bg: string; fg: string } {
  switch (category) {
    case 'dairy':
    case 'fish':
    case 'drink':
      return { bg: colors.weightSoft, fg: colors.weight };
    case 'meat':
    case 'fruit':
      return { bg: softTint(colors.milestone3, '1B'), fg: colors.milestone3 };
    case 'eggs':
    case 'grains':
    case 'sauce':
      return { bg: softTint(colors.fat, '22'), fg: colors.fat };
    case 'snack':
    case 'meal':
      return { bg: colors.bodySoft, fg: colors.body };
    case 'veg':
    case 'other':
      return { bg: colors.track, fg: colors.muted };
  }
}

/**
 * A small, refined line icon for a food's category, in a softly tinted circle.
 * Never green or orange: those colours belong strictly to steps and calories.
 */
export function FoodIcon({
  food,
  size = 34,
}: {
  food: { category?: string | null; name?: string | null };
  size?: number;
}) {
  const { colors } = useTheme();
  const cat = categoryFor(food);
  const Icon = CATEGORY_ICONS[cat];
  const { bg, fg } = categoryTint(cat, colors);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
