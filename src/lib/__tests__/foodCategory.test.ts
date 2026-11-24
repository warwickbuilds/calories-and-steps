import { categoryFor, categoryFromOffTags, guessCategory, isFoodCategory } from '../foodCategory';

describe('guessCategory', () => {
  it.each([
    ['Pasture raised free range eggs', 'eggs'],
    ['Beerenberg BBQ sauce', 'sauce'],
    ['Woolworths deli ham off the bone', 'meat'],
    ['Rokeby FitMilk', 'dairy'],
    ['Strength Meal Co. Lemon Herb Chicken', 'meal'],
    ['Strength Meals Co. Lemon Herb Chicken with Roasted Potatoes', 'meal'],
    ['Grilled chicken with rice', 'meal'],
    ['Fish and chips', 'meal'],
    ['Strawberry yoghurt', 'dairy'],
    ['Apple juice', 'drink'],
    ['Coffee with milk', 'drink'],
    ['Flat white', 'drink'],
    ['Peanut butter', 'sauce'],
    ['Milk chocolate', 'snack'],
    ['Cheesecake', 'snack'],
    ['Banana', 'fruit'],
    ['Pineapple pieces', 'fruit'],
    ['Sweet potato', 'veg'],
    ['Eggplant', 'veg'],
    ['Sourdough toast', 'grains'],
    ['Atlantic salmon fillet', 'fish'],
    ['Mac and cheese', 'meal'],
    ['Salt and vinegar chips', 'snack'],
    ['Crème fraîche', 'dairy'],
  ])('%s → %s', (name, expected) => {
    expect(guessCategory(name)).toBe(expected);
  });

  it('is null when nothing is recognised', () => {
    expect(guessCategory('Quick add')).toBeNull();
    expect(guessCategory('')).toBeNull();
    expect(guessCategory(null)).toBeNull();
  });
});

describe('categoryFromOffTags', () => {
  it('uses the most specific tag', () => {
    expect(categoryFromOffTags(['en:dairies', 'en:milks', 'en:skimmed-milks'])).toBe('dairy');
    expect(categoryFromOffTags(['en:condiments', 'en:sauces', 'en:barbecue-sauces'])).toBe('sauce');
    expect(categoryFromOffTags(['en:meats-and-their-products', 'en:meats', 'en:prepared-meats', 'en:hams'])).toBe('meat');
    expect(categoryFromOffTags(['en:farming-products', 'en:eggs', 'en:chicken-eggs'])).toBe('eggs');
    expect(categoryFromOffTags(['en:beverages', 'en:fruit-juices', 'en:orange-juices'])).toBe('drink');
    expect(categoryFromOffTags(['en:snacks', 'en:sweet-snacks', 'en:biscuits-and-cakes', 'en:biscuits'])).toBe('snack');
  });

  it('skips tags that are too broad', () => {
    expect(categoryFromOffTags(['en:plant-based-foods-and-beverages', 'en:plant-based-foods'])).toBeNull();
    expect(categoryFromOffTags(['en:plant-based-foods-and-beverages', 'en:fruits'])).toBe('fruit');
  });

  it('copes with missing or odd input', () => {
    expect(categoryFromOffTags(undefined)).toBeNull();
    expect(categoryFromOffTags([42, null])).toBeNull();
    expect(categoryFromOffTags([])).toBeNull();
  });
});

describe('categoryFor', () => {
  it('prefers the stored category, then the name, then other', () => {
    expect(categoryFor({ category: 'fish', name: 'Ham' })).toBe('fish');
    expect(categoryFor({ category: null, name: 'Ham' })).toBe('meat');
    expect(categoryFor({ category: 'nonsense', name: 'Quick add' })).toBe('other');
  });

  it('checks values', () => {
    expect(isFoodCategory('veg')).toBe(true);
    expect(isFoodCategory('vegetables')).toBe(false);
  });
});
