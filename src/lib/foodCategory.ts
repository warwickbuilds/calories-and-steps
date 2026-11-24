/**
 * A small set of food categories, used only to show a minimal icon beside
 * each food. The category comes from Open Food Facts for barcodes, from the
 * AI for photo, voice and label reads, or from the person's own pick; when
 * none is stored, it is guessed from the food's name.
 */

export const FOOD_CATEGORIES = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' },
  { value: 'fish', label: 'Fish and seafood' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'grains', label: 'Bread and grains' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'veg', label: 'Vegetables' },
  { value: 'sauce', label: 'Sauces and oils' },
  { value: 'snack', label: 'Snacks and sweets' },
  { value: 'drink', label: 'Drinks' },
  { value: 'meal', label: 'Meals' },
  { value: 'other', label: 'Other' },
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number]['value'];

export const FOOD_CATEGORY_VALUES = FOOD_CATEGORIES.map((c) => c.value) as unknown as readonly [
  FoodCategory,
  ...FoodCategory[],
];

export const isFoodCategory = (v: unknown): v is FoodCategory =>
  typeof v === 'string' && (FOOD_CATEGORY_VALUES as readonly string[]).includes(v);

export const categoryLabel = (c: FoodCategory) => FOOD_CATEGORIES.find((f) => f.value === c)?.label ?? 'Other';

/**
 * Words that point to a category. A word matches exactly, as a plural, or
 * (for words of 4+ letters) at the end of a longer word, so "FitMilk" is
 * dairy and "pineapple" is fruit.
 */
const KEYWORDS: Record<Exclude<FoodCategory, 'other'>, string[]> = {
  meal: [
    'meal', 'dish', 'curry', 'stew', 'casserole', 'lasagne', 'lasagna', 'risotto', 'stirfry', 'burger', 'pizza',
    'sandwich', 'wrap', 'burrito', 'taco', 'sushi', 'soup', 'salad', 'pie', 'kebab', 'nachos', 'bolognese',
    'carbonara', 'omelette', 'omelet', 'frittata', 'quiche', 'dumpling', 'bowl', 'roll',
  ],
  sauce: [
    'sauce', 'ketchup', 'mayo', 'mayonnaise', 'mustard', 'dressing', 'gravy', 'relish', 'chutney', 'pesto', 'salsa',
    'oil', 'vinegar', 'spread', 'vegemite', 'marmite', 'nutella', 'jam', 'honey', 'syrup', 'condiment', 'aioli',
    'hummus', 'dip', 'margarine', 'ghee', 'lard', 'fat', 'peanutbutter', 'nutbutter', 'almondbutter', 'cashewbutter',
  ],
  snack: [
    'snack', 'chocolate', 'choc', 'biscuit', 'cookie', 'cake', 'muffin', 'brownie', 'donut', 'doughnut', 'chips',
    'crisps', 'popcorn', 'pretzel', 'lolly', 'lollies', 'candy', 'candies', 'licorice', 'sweet', 'confectionery',
    'dessert', 'pudding', 'icecream', 'gelato', 'bar', 'nut', 'peanut', 'almond', 'cashew', 'walnut', 'pistachio',
    'trailmix', 'cracker', 'slice', 'tart', 'pastry',
  ],
  eggs: ['egg'],
  fish: [
    'fish', 'seafood', 'salmon', 'tuna', 'cod', 'barramundi', 'snapper', 'prawn', 'shrimp', 'crab', 'lobster',
    'oyster', 'mussel', 'squid', 'calamari', 'sardine', 'anchovy', 'anchovies', 'mackerel', 'trout', 'scallop',
  ],
  meat: [
    'meat', 'ham', 'bacon', 'sausage', 'chicken', 'beef', 'steak', 'pork', 'lamb', 'turkey', 'duck', 'veal',
    'mince', 'salami', 'prosciutto', 'pepperoni', 'chorizo', 'jerky', 'poultry', 'poultries', 'deli', 'schnitzel',
    'meatball', 'rissole', 'brisket', 'ribs', 'cutlet', 'chop', 'charcuterie', 'kangaroo', 'venison',
  ],
  dairy: [
    'dairy', 'dairies', 'milk', 'cheese', 'yoghurt', 'yogurt', 'cream', 'butter', 'kefir', 'custard', 'feta',
    'creme', 'cheddar', 'mozzarella', 'parmesan', 'ricotta', 'halloumi', 'brie', 'skyr', 'quark',
  ],
  drink: [
    'drink', 'beverage', 'water', 'juice', 'soda', 'cola', 'coke', 'lemonade', 'coffee', 'latte', 'cappuccino',
    'flatwhite', 'espresso', 'tea', 'smoothie', 'shake', 'beer', 'wine', 'cider', 'spirit', 'vodka', 'whisky',
    'whiskey', 'gin', 'rum', 'kombucha', 'cordial', 'electrolyte',
  ],
  grains: [
    'bread', 'toast', 'grain', 'cereal', 'oat', 'oats', 'porridge', 'muesli', 'granola', 'rice', 'pasta',
    'spaghetti', 'noodle', 'flour', 'wheat', 'bagel', 'crumpet', 'croissant', 'tortilla', 'pita', 'naan',
    'sourdough', 'baguette', 'bun', 'quinoa', 'couscous', 'barley', 'pancake', 'waffle', 'weetbix', 'cornflakes',
    'macaroni', 'mac', 'ricecake',
  ],
  fruit: [
    'fruit', 'apple', 'banana', 'orange', 'mandarin', 'pear', 'grape', 'berry', 'berries', 'strawberry', 'mango',
    'melon', 'kiwi', 'peach', 'plum', 'cherry', 'cherries', 'apricot', 'lemon', 'lime', 'pineapple', 'avocado',
    'date', 'fig', 'raisin', 'sultana', 'nectarine', 'passionfruit', 'papaya', 'pomegranate',
  ],
  veg: [
    'vegetable', 'veg', 'veggie', 'potato', 'potatoes', 'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato',
    'tomatoes', 'cucumber', 'capsicum', 'pepper', 'onion', 'garlic', 'pumpkin', 'zucchini', 'corn', 'pea', 'peas',
    'bean', 'lentil', 'chickpea', 'tofu', 'mushroom', 'cabbage', 'kale', 'cauliflower', 'celery', 'asparagus',
    'beetroot', 'sweetcorn', 'eggplant', 'legume', 'edamame', 'greens', 'coleslaw',
  ],
};

const CATEGORY_ORDER = Object.keys(KEYWORDS) as Exclude<FoodCategory, 'other'>[];

/**
 * Category for one word, or null. An exact (or plural) match anywhere beats
 * a match at the end of a longer word; earlier categories win a tie.
 */
function wordCategory(word: string): FoodCategory | null {
  for (const c of CATEGORY_ORDER) {
    if (KEYWORDS[c].some((k) => word === k || word === `${k}s` || word === `${k}es`)) return c;
  }
  for (const c of CATEGORY_ORDER) {
    if (KEYWORDS[c].some((k) => k.length >= 4 && word.length > k.length && (word.endsWith(k) || word.endsWith(`${k}s`)))) {
      return c;
    }
  }
  return null;
}

/** Two-word foods that mean something else apart. */
const PHRASES: [RegExp, string][] = [
  [/\b(peanut|nut|almond|cashew) butter/g, '$1butter'],
  [/\bice cream/g, 'icecream'],
  [/\bflat white/g, 'flatwhite'],
  [/\bstir fry/g, 'stirfry'],
  [/\btrail mix/g, 'trailmix'],
  [/\bweet ?bix/g, 'weetbix'],
  [/\bcorn flakes/g, 'cornflakes'],
];

function words(text: string): string[] {
  let t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, ' ');
  for (const [re, to] of PHRASES) t = t.replace(re, to);
  return t.split(' ').filter(Boolean);
}

/**
 * The last word with a category wins, because in English the main noun
 * comes last ("strawberry yoghurt" is dairy, "apple juice" a drink).
 */
function headCategory(ws: string[]): FoodCategory | null {
  for (let i = ws.length - 1; i >= 0; i--) {
    const c = wordCategory(ws[i]);
    if (c) return c;
  }
  return null;
}

/**
 * Guesses a category from a food's name. Something "with" something else,
 * or two different foods joined by "and", is a meal. Null when nothing
 * in the name is recognised.
 */
export function guessCategory(name: string | null | undefined): FoodCategory | null {
  if (!name) return null;
  const ws = words(name);
  if (ws.includes('meal') || ws.includes('meals')) return 'meal';
  const joiner = ws.findIndex((w) => w === 'with' || w === 'and' || w === 'n');
  if (joiner > 0) {
    const left = headCategory(ws.slice(0, joiner));
    const right = headCategory(ws.slice(joiner + 1));
    if (left === 'drink') return left; // "Coffee with milk"
    if (ws[joiner] === 'with' && left && right && left !== right && left !== 'sauce' && right !== 'sauce') {
      return 'meal';
    }
    if (ws[joiner] !== 'with' && left && right && left !== right && !['sauce', 'fruit'].includes(left)) return 'meal';
    return left ?? right;
  }
  return headCategory(ws);
}

/** Tags too broad to say anything about the food. */
const GENERIC_TAG = /^(plant-based-foods(-and-beverages)?|foods?|beverages-and-beverages-preparations|farming-products|groceries|.*-and-their-products|cereals-and-potatoes|fresh-foods|frozen-foods|canned-foods|dried-products)$/;

/**
 * Category from Open Food Facts' `categories_tags`, which run from general
 * to specific ("en:dairies", "en:milks", "en:skimmed-milks"). The most
 * specific tag that names a known food wins.
 */
export function categoryFromOffTags(tags: unknown): FoodCategory | null {
  if (!Array.isArray(tags)) return null;
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = typeof tags[i] === 'string' ? tags[i].replace(/^[a-z]{2}:/, '') : '';
    if (!tag || GENERIC_TAG.test(tag)) continue;
    const c = headCategory(tag.split('-'));
    if (c) return c;
  }
  return null;
}

/** What to draw for a food: its stored category, else a guess from its name, else "other". */
export function categoryFor(food: { category?: string | null; name?: string | null }): FoodCategory {
  if (isFoodCategory(food.category)) return food.category;
  return guessCategory(food.name) ?? 'other';
}
