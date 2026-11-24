import { router, useLocalSearchParams } from 'expo-router';

import { FoodEditor } from '@/components/FoodEditor';
import { addFood } from '@/db/meals';
import { toLocalDateString } from '@/lib/dates';
import { isLocalDate, isMealType } from '@/lib/today';

/** Type in calories (and optional macros) for anything. */
export default function QuickAddScreen() {
  const params = useLocalSearchParams<{ meal?: string; day?: string; name?: string; from?: string }>();
  const day = isLocalDate(params.day) ? params.day : toLocalDateString();
  return (
    <FoodEditor
      title="Quick add"
      initial={{ name: params.name ?? '' }}
      initialMeal={isMealType(params.meal) ? params.meal : 'snack'}
      saveLabel="Add"
      autoFocusCalories
      onSave={async (food, mealType) => {
        await addFood({ day, mealType, food });
        // Opened from the add-food list: close that too.
        router.dismiss(params.from === 'add' ? 2 : 1);
      }}
    />
  );
}
