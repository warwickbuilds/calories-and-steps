import { parseLabelAnswer } from '../ai/nutritionLabel';
import { displayName, isBarcode, nutritionFor, offUnit, offUrl, parseOffProduct } from '../openFoodFacts';

describe('parseOffProduct', () => {
  it('reads per-100 g values', () => {
    const food = parseOffProduct({
      status: 1,
      product: {
        product_name: 'Rolled Oats',
        brands: 'Uncle Tobys, Nestlé',
        serving_quantity: '40',
        categories_tags: ['en:plant-based-foods-and-beverages', 'en:cereals-and-potatoes', 'en:breakfast-cereals', 'en:rolled-oats'],
        nutriments: { 'energy-kcal_100g': 375.4, proteins_100g: 11.04, carbohydrates_100g: 56, fat_100g: 8.5 },
      },
    });
    expect(food).toEqual({
      name: 'Rolled Oats',
      brand: 'Uncle Tobys',
      caloriesPer100g: 375,
      proteinPer100g: 11,
      carbsPer100g: 56,
      fatPer100g: 8.5,
      servingG: 40,
      unit: 'g',
      category: 'grains',
    });
  });

  it('reads drinks as per 100 ml', () => {
    const food = parseOffProduct({
      status: 1,
      product: {
        product_name: 'FitMilk',
        brands: 'Rokeby',
        quantity: '1 L',
        serving_quantity: 250,
        serving_quantity_unit: 'ml',
        nutriments: { 'energy-kcal_100g': 43, proteins_100g: 5 },
      },
    });
    expect(food?.unit).toBe('ml');
    expect(food?.servingG).toBe(250);
  });

  it('converts kJ when calories are missing', () => {
    const food = parseOffProduct({ status: 1, product: { product_name: 'X', nutriments: { 'energy-kj_100g': 1569 } } });
    expect(food?.caloriesPer100g).toBe(375);
    expect(food?.proteinPer100g).toBeNull();
  });

  it('returns null for unknown products or no energy', () => {
    expect(parseOffProduct({ status: 0 })).toBeNull();
    expect(parseOffProduct({ status: 1, product: { product_name: 'X', nutriments: {} } })).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });

  it('names unnamed products and ignores silly servings', () => {
    const food = parseOffProduct({
      status: 1,
      product: { serving_quantity: 0, nutriments: { 'energy-kcal_100g': 50 } },
    });
    expect(food?.name).toBe('Unnamed product');
    expect(food?.servingG).toBeNull();
  });
});

describe('barcode helpers', () => {
  it('accepts EAN and UPC lengths', () => {
    expect(isBarcode('9300617003014')).toBe(true);
    expect(isBarcode('12345678')).toBe(true);
    expect(isBarcode('123')).toBe(false);
    expect(isBarcode('abc45678')).toBe(false);
  });

  it('builds the lookup URL with only the fields used', () => {
    expect(offUrl('9300617003014')).toBe(
      'https://world.openfoodfacts.org/api/v2/product/9300617003014.json?fields=product_name,generic_name,brands,nutriments,serving_quantity,serving_quantity_unit,serving_size,quantity,product_quantity_unit,categories_tags',
    );
  });

  it('scales per-100 g values to an amount', () => {
    expect(
      nutritionFor({ caloriesPer100g: 375, proteinPer100g: 11, carbsPer100g: 56, fatPer100g: 8.5 }, 40),
    ).toEqual({ calories: 150, proteinG: 4.4, carbsG: 22.4, fatG: 3.4, grams: 40 });
  });

  it('does not repeat the brand', () => {
    expect(displayName({ name: 'Rolled Oats', brand: 'Uncle Tobys' })).toBe('Uncle Tobys Rolled Oats');
    expect(displayName({ name: 'Uncle Tobys Oats', brand: 'Uncle Tobys' })).toBe('Uncle Tobys Oats');
    expect(displayName({ name: 'Oats', brand: null })).toBe('Oats');
  });
});

describe('parseLabelAnswer', () => {
  const base = { isLabel: true, name: 'Muesli bar', energyUnit: 'kcal', servingG: 30 };

  it('keeps per-100 values', () => {
    expect(
      parseLabelAnswer({ ...base, per100: { basis: 'per100', energy: 420, protein: 8, carbs: 60, fat: 15 } }),
    ).toEqual({
      name: 'Muesli bar',
      caloriesPer100g: 420,
      proteinPer100g: 8,
      carbsPer100g: 60,
      fatPer100g: 15,
      servingG: 30,
      unit: 'g',
      category: null,
    });
  });

  it('keeps a known category and drops "other"', () => {
    const per100 = { basis: 'per100', energy: 420 };
    expect(parseLabelAnswer({ ...base, category: 'snack', per100 })?.category).toBe('snack');
    expect(parseLabelAnswer({ ...base, category: 'other', per100 })?.category).toBeNull();
    expect(parseLabelAnswer({ ...base, category: 'pudding', per100 })?.category).toBeNull();
  });

  it('keeps ml for drinks', () => {
    const r = parseLabelAnswer({
      ...base,
      unit: 'ml',
      servingG: 250,
      per100: { basis: 'per100', energy: 43, protein: 5, carbs: 2.5, fat: 1.5 },
    });
    expect(r?.unit).toBe('ml');
    expect(r?.servingG).toBe(250);
    expect(parseLabelAnswer({ ...base, unit: 'litres', per100: { basis: 'per100', energy: 43 } })?.unit).toBe('g');
  });

  it('converts kJ and per-serving columns', () => {
    const r = parseLabelAnswer({
      ...base,
      energyUnit: 'kJ',
      per100: { basis: 'perServing', energy: 527, protein: 2.4, carbs: null, fat: 4.5 },
    });
    expect(r?.caloriesPer100g).toBe(420);
    expect(r?.proteinPer100g).toBe(8);
    expect(r?.carbsPer100g).toBeNull();
    expect(r?.fatPer100g).toBe(15);
  });

  it('rejects non-labels and impossible numbers', () => {
    expect(parseLabelAnswer({ ...base, isLabel: false, per100: { basis: 'per100', energy: 0 } })).toBeNull();
    expect(parseLabelAnswer({ ...base, per100: { basis: 'per100', energy: 4000, protein: 1, carbs: 1, fat: 1 } })).toBeNull();
    expect(
      parseLabelAnswer({ ...base, servingG: null, per100: { basis: 'perServing', energy: 100, protein: 1, carbs: 1, fat: 1 } }),
    ).toBeNull();
  });
});

describe('offUnit', () => {
  it('uses the serving unit first', () => {
    expect(offUnit({ serving_quantity_unit: 'ml', quantity: '500 g' })).toBe('ml');
    expect(offUnit({ serving_quantity_unit: 'g', quantity: '1 L' })).toBe('g');
  });

  it('falls back to the serving text, then the pack size', () => {
    expect(offUnit({ serving_size: '250 mL' })).toBe('ml');
    expect(offUnit({ serving_size: '1 cup (250 ml / 258 g)' })).toBe('g');
    expect(offUnit({ product_quantity_unit: 'ml' })).toBe('ml');
    expect(offUnit({ quantity: '2 L' })).toBe('ml');
    expect(offUnit({ quantity: '330ml' })).toBe('ml');
    expect(offUnit({ quantity: '6 x 330 ml' })).toBe('ml');
    expect(offUnit({ quantity: '750 g' })).toBe('g');
  });

  it('defaults to grams', () => {
    expect(offUnit({})).toBe('g');
    expect(offUnit(null)).toBe('g');
    expect(offUnit({ quantity: 'Large' })).toBe('g');
  });
});
