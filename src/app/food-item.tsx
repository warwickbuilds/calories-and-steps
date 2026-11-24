import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { FoodEditor } from '@/components/FoodEditor';
import { Button, Screen, Text } from '@/components/ui';
import { addFood, deleteFoodItem, updateFoodItem } from '@/db/meals';
import { useFoodItem } from '@/hooks/data';
import { toLocalDateString } from '@/lib/dates';
import type { Nutrition } from '@/lib/food';
import { isLocalDate, isMealType } from '@/lib/today';

/**
 * Edit a logged item (`?id=`), or add a food picked from the recent list
 * (`?food=<json>&meal=&day=`), with portion buttons to rescale it.
 */
export default function FoodItemScreen() {
  const params = useLocalSearchParams<{ id?: string; food?: string; meal?: string; day?: string }>();
  if (params.id) return <EditItem id={Number(params.id)} />;
  return <AddRecent food={params.food} meal={params.meal} day={params.day} />;
}

function EditItem({ id }: { id: number }) {
  const { item, loaded } = useFoodItem(id);
  if (!loaded) return null;
  if (!item) {
    return (
      <Screen title="Edit food" edges={['top', 'bottom']}>
        <Text muted>This food has been deleted.</Text>
      </Screen>
    );
  }
  const base: Nutrition = item;
  const remove = () =>
    Alert.alert(`Delete ${item.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await deleteFoodItem(id);
        },
      },
    ]);
  return (
    <FoodEditor
      key={id}
      title="Edit food"
      initial={item}
      base={base}
      initialMeal={item.mealType}
      saveLabel="Save"
      onSave={async (food, mealType) => {
        await updateFoodItem(id, food, mealType);
        router.back();
      }}
      footerExtra={<Button variant="ghost" label="Delete" onPress={remove} />}
    />
  );
}

function parseFood(json: string | undefined): ({ name: string } & Nutrition) | null {
  if (!json) return null;
  try {
    const f = JSON.parse(json);
    if (typeof f?.name !== 'string' || typeof f?.calories !== 'number') return null;
    const n = (v: unknown) => (typeof v === 'number' ? v : null);
    return { name: f.name, calories: f.calories, proteinG: n(f.proteinG), carbsG: n(f.carbsG), fatG: n(f.fatG), grams: n(f.grams), unit: f.unit === 'ml' ? 'ml' : 'g' };
  } catch {
    return null;
  }
}

function AddRecent({ food: json, meal, day: dayParam }: { food?: string; meal?: string; day?: string }) {
  const food = parseFood(json);
  const day = isLocalDate(dayParam) ? dayParam : toLocalDateString();
  return (
    <FoodEditor
      title="Add food"
      initial={food ?? undefined}
      base={food}
      initialMeal={isMealType(meal) ? meal : 'snack'}
      saveLabel="Add"
      onSave={async (values, mealType) => {
        await addFood({ day, mealType, food: values });
        // Close this screen and the add-food list under it.
        router.dismiss(2);
      }}
    />
  );
}
