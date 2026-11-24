/**
 * Reads a photo of a nutrition information panel into per-100 g numbers.
 * Used when a barcode isn't in Open Food Facts, or straight from Add food.
 */

import type { Per100g } from '../openFoodFacts';
import type { AiImage, AiJsonRequest } from './providers';

export const NUTRITION_LABEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isLabel', 'name', 'per100', 'servingG', 'energyUnit', 'unit'],
  properties: {
    isLabel: { type: 'boolean', description: 'False if the photo is not a nutrition label' },
    name: { type: ['string', 'null'], description: 'Product name if visible on the photo' },
    energyUnit: { type: 'string', enum: ['kcal', 'kJ'], description: 'Unit of the energy value given in per100.energy' },
    per100: {
      type: 'object',
      additionalProperties: false,
      required: ['basis', 'energy', 'protein', 'carbs', 'fat'],
      properties: {
        basis: { type: 'string', enum: ['per100', 'perServing'] },
        energy: { type: 'number' },
        protein: { type: ['number', 'null'] },
        carbs: { type: ['number', 'null'] },
        fat: { type: ['number', 'null'] },
      },
    },
    servingG: { type: ['number', 'null'], description: 'Grams (or ml) in one serving, if stated' },
    unit: { type: 'string', enum: ['g', 'ml'], description: '"ml" if the label is per 100 ml (a drink), otherwise "g"' },
  },
} as const;

export const NUTRITION_LABEL_PROMPT = `This photo should show a nutrition information panel from food packaging. Read it.

Rules:
- Prefer the "per 100 g" (or "per 100 ml") column and set basis "per100". Only if there is no per-100 column, use the per-serving column and set basis "perServing".
- energy: the energy value from that column. If both kJ and kcal (Calories) are shown, use the kcal value and energyUnit "kcal". If only kJ is shown, give the kJ value and energyUnit "kJ".
- carbs is total carbohydrate. In US-style labels "Total Carbohydrate"; in Australian/UK/EU labels "Carbohydrate". Do not use "of which sugars".
- fat is total fat. protein is protein. Use null for anything not shown.
- servingG: the serving size in grams or ml, if stated (e.g. "Serving size: 30g" → 30, "Serving size: 250mL" → 250).
- unit: "ml" if the column is per 100 ml or the serving is given in ml (drinks, milk, juice, liquid yoghurt), otherwise "g".
- name: the product name if it is visible, otherwise null.
- If the photo is not a nutrition label, set isLabel false and use 0 and nulls.`;

export function nutritionLabelRequest(image: AiImage): AiJsonRequest {
  return {
    prompt: NUTRITION_LABEL_PROMPT,
    images: [image],
    schema: NUTRITION_LABEL_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'nutrition_label',
    maxOutputTokens: 1000,
  };
}

const KJ_PER_CALORIE = 4.184;
const r1 = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null);

/**
 * Turns the model's answer into per-100 g numbers, converting kJ and
 * per-serving values. Null if it isn't a usable label.
 */
export function parseLabelAnswer(answer: any): (Omit<Per100g, 'name' | 'brand'> & { name: string | null }) | null {
  if (!answer || answer.isLabel === false || !answer.per100) return null;
  const p = answer.per100;
  let energy = typeof p.energy === 'number' && p.energy > 0 ? p.energy : null;
  if (energy == null) return null;
  if (answer.energyUnit === 'kJ') energy /= KJ_PER_CALORIE;
  const servingG = r1(answer.servingG);
  let factor = 1;
  if (p.basis === 'perServing') {
    if (!servingG) return null; // Can't turn a serving into per-100 g without its size.
    factor = 100 / servingG;
  }
  const scale = (v: number | null) => (v == null ? null : r1(v * factor));
  const calories = Math.round(energy * factor);
  if (calories > 950) return null; // Above pure fat: a misread.
  return {
    name: typeof answer.name === 'string' && answer.name.trim() ? answer.name.trim() : null,
    caloriesPer100g: calories,
    proteinPer100g: scale(r1(p.protein)),
    carbsPer100g: scale(r1(p.carbs)),
    fatPer100g: scale(r1(p.fat)),
    servingG: servingG && servingG > 0 ? servingG : null,
    unit: answer.unit === 'ml' ? 'ml' : 'g',
  };
}
