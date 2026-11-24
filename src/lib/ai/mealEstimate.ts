/**
 * Estimates a meal from a photo, a spoken or typed description, or both.
 * The model lists each component with grams, calories and macros; the
 * person checks and edits the list before anything is saved.
 */

import type { FoodUnit, Nutrition } from '../food';
import { FOOD_CATEGORY_VALUES, isFoodCategory, type FoodCategory } from '../foodCategory';
import type { AiImage, AiJsonRequest } from './providers';

export const MEAL_ESTIMATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isFood', 'mealName', 'items'],
  properties: {
    isFood: { type: 'boolean', description: 'False if there is no food or drink to estimate' },
    mealName: { type: 'string', description: 'Short name for the whole meal, e.g. "Chicken stir-fry with rice"' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grams', 'unit', 'category', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
        properties: {
          name: { type: 'string' },
          grams: { type: 'number', description: 'Estimated amount: edible weight in grams, or volume in ml for drinks' },
          unit: { type: 'string', enum: ['g', 'ml'], description: '"ml" for drinks and other liquids, otherwise "g"' },
          category: { type: 'string', enum: FOOD_CATEGORY_VALUES, description: 'What kind of food the item is' },
          calories: { type: 'number' },
          protein: { type: 'number', description: 'grams' },
          carbs: { type: 'number', description: 'grams' },
          fat: { type: 'number', description: 'grams' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
  },
} as const;

export function mealEstimatePrompt(description: string, hasPhoto: boolean): string {
  const said = description.trim();
  return `You are estimating the energy and macronutrients of one meal for a calorie-tracking app. Use metric units.

${hasPhoto ? 'The photo shows the meal.' : 'There is no photo; work from the description alone.'}
${said ? `The person described it as: """${said.slice(0, 1500)}"""` : 'The person gave no description.'}

Rules:
- List each separate component (for example the rice, the chicken, the sauce, the drink) as one item. Combine tiny garnishes into the item they belong to.
- The description is the person's own account and wins over what the photo seems to show: use it for amounts, brands, cooking methods, hidden ingredients (oil, butter, sugar, dressing) and anything not visible. If they say they ate only part of it, count only that part.
- Amounts: grams for food. For drinks and other liquids (milk, juice, soft drink, coffee, soup by the cup, alcohol) give the volume in ml and set unit "ml".
- Estimate grams from the photo using plate, cutlery and hand size as scale. Include cooking oil and sauces that are likely but not visible, as their own item when significant.
- calories are food calories (kcal). protein, carbs and fat in grams. Make them consistent: calories should be close to 4 × protein + 4 × carbs + 9 × fat (alcohol adds 7 per gram).
- category: what kind of food each item is, from the list (dairy, meat, fish, eggs, grains for bread/rice/pasta/cereal, fruit, veg for vegetables and legumes, sauce for sauces/oils/spreads, snack for snacks and sweets, drink, meal for a mixed dish you can't split, other).
- confidence: "high" when the item and amount are clear (or stated), "medium" for a reasonable guess, "low" when the item or amount is hard to tell.
- mealName: a short, plain name for the whole meal.
- If there is no food or drink, set isFood false and return no items.`;
}

export function mealEstimateRequest(input: { image: AiImage | null; description: string }): AiJsonRequest {
  return {
    prompt: mealEstimatePrompt(input.description, !!input.image),
    images: input.image ? [input.image] : [],
    schema: MEAL_ESTIMATE_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'meal_estimate',
    maxOutputTokens: 3000,
  };
}

export interface EstimatedItem extends Nutrition {
  name: string;
  grams: number;
  unit: FoodUnit;
  category: FoodCategory | null;
  confidence: 'low' | 'medium' | 'high';
}

export interface MealEstimate {
  mealName: string;
  items: EstimatedItem[];
}

const r1 = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null);

/**
 * Checks the model's answer. Items without a name or with impossible numbers
 * are dropped. Null when there is nothing usable (not food, or no items).
 */
export function parseMealAnswer(answer: any): MealEstimate | null {
  if (!answer || answer.isFood === false || !Array.isArray(answer.items)) return null;
  const items: EstimatedItem[] = [];
  for (const it of answer.items) {
    const name = typeof it?.name === 'string' ? it.name.trim() : '';
    const calories = r1(it?.calories);
    const grams = r1(it?.grams);
    if (!name || calories == null || calories > 5000 || grams == null || grams > 5000) continue;
    items.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      grams: Math.round(grams),
      unit: it.unit === 'ml' ? 'ml' : 'g',
      category: isFoodCategory(it.category) && it.category !== 'other' ? it.category : null,
      calories: Math.round(calories),
      proteinG: r1(it.protein),
      carbsG: r1(it.carbs),
      fatG: r1(it.fat),
      confidence: it.confidence === 'low' || it.confidence === 'high' ? it.confidence : 'medium',
    });
  }
  if (items.length === 0) return null;
  const mealName = typeof answer.mealName === 'string' && answer.mealName.trim() ? answer.mealName.trim() : items[0].name;
  return { mealName, items };
}

/** Sum of the items, for the review screen's total line. */
export function totalOf(items: Pick<Nutrition, 'calories' | 'proteinG' | 'carbsG' | 'fatG'>[]) {
  return items.reduce<{ calories: number; proteinG: number; carbsG: number; fatG: number }>(
    (t, i) => ({
      calories: t.calories + (i.calories || 0),
      proteinG: t.proteinG + (i.proteinG ?? 0),
      carbsG: t.carbsG + (i.carbsG ?? 0),
      fatG: t.fatG + (i.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
