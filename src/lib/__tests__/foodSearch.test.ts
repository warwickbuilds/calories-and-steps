import { cleanQuery, countryForLocale, offSearchUrl, parseOffSearch, searchFoodDatabase, tidyBrand } from '../foodSearch';

describe('countryForLocale', () => {
  it('finds the country in common locale shapes', () => {
    expect(countryForLocale('en-AU')).toEqual({ code: 'AU', name: 'Australia', tag: 'en:australia' });
    expect(countryForLocale('en_NZ')?.tag).toBe('en:new-zealand');
    expect(countryForLocale('en-GB-u-ca-gregory')?.tag).toBe('en:united-kingdom');
    expect(countryForLocale('zh-Hant-SG')?.code).toBe('SG');
  });

  it('returns null without a known region', () => {
    expect(countryForLocale('en')).toBeNull();
    expect(countryForLocale('en-AQ')).toBeNull();
    expect(countryForLocale(undefined)).toBeNull();
  });
});

describe('offSearchUrl', () => {
  it('filters by country and escapes the query syntax', () => {
    const url = offSearchUrl('Weet-Bix (big)', 'en:australia');
    expect(url.startsWith('https://search.openfoodfacts.org/search?q=')).toBe(true);
    expect(decodeURIComponent(url.split('q=')[1].split('&')[0])).toBe('Weet Bix big countries:"en:australia"');
    expect(url).toContain('fields=code,product_name,');
  });

  it('searches everywhere without a country', () => {
    expect(decodeURIComponent(offSearchUrl('oats', null).split('q=')[1].split('&')[0])).toBe('oats');
  });

  it('cleans to nothing for punctuation only', () => {
    expect(cleanQuery(' "():- ')).toBe('');
  });
});

describe('tidyBrand', () => {
  it('drops language prefixes and capitalises lowercase brands', () => {
    expect(tidyBrand('xx:sanitarium')).toBe('Sanitarium');
    expect(tidyBrand('uncle tobys')).toBe('Uncle Tobys');
    expect(tidyBrand('McCain')).toBe('McCain');
  });
});

describe('parseOffSearch', () => {
  const json = {
    hits: [
      {
        code: '9310653106259',
        brands: ['chobani'],
        product_name: 'Strawberry yoghurt',
        serving_quantity: 130,
        product_quantity_unit: 'g',
        categories: ['en:dairies', 'en:yogurts'],
        nutriments: { 'energy-kcal_100g': 78.5, proteins_100g: 7, carbohydrates_100g: 4.46, fat_100g: 3.54 },
      },
      { code: '13333508', brands: ['sanitarium'], product_name: 'Weet-Bix' },
      { code: '9310653106260', brands: ['chobani'], product_name: 'Strawberry Yoghurt', nutriments: { 'energy-kcal_100g': 80 } },
      { code: '123', nutriments: { 'energy-kcal_100g': 80 } },
    ],
  };

  it('keeps products with calories, once per name and brand', () => {
    const hits = parseOffSearch(json);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toEqual({
      barcode: '9310653106259',
      food: {
        name: 'Strawberry yoghurt',
        brand: 'Chobani',
        caloriesPer100g: 79,
        proteinPer100g: 7,
        carbsPer100g: 4.5,
        fatPer100g: 3.5,
        servingG: 130,
        unit: 'g',
        category: 'dairy',
      },
    });
  });

  it('copes with junk', () => {
    expect(parseOffSearch(null)).toEqual([]);
    expect(parseOffSearch({ hits: 'x' })).toEqual([]);
  });
});

describe('searchFoodDatabase', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns hits', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hits: [{ code: '1', product_name: 'Oats', nutriments: { 'energy-kcal_100g': 375 } }] }),
    }) as any;
    const r = await searchFoodDatabase('oats', 'en:australia', '0.30.0');
    expect(r.kind === 'results' && r.hits[0].food.name).toBe('Oats');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('countries%3A%22en%3Aaustralia%22');
    expect(init.headers['User-Agent']).toContain('CaloriesAndSteps/0.30.0');
  });

  it('reports offline on errors and bad status', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as any;
    expect(await searchFoodDatabase('oats', null, '1')).toEqual({ kind: 'offline' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as any;
    expect(await searchFoodDatabase('oats', null, '1')).toEqual({ kind: 'offline' });
  });

  it('skips the request for an empty query', async () => {
    global.fetch = jest.fn() as any;
    expect(await searchFoodDatabase(' ', null, '1')).toEqual({ kind: 'results', hits: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rethrows when the caller aborts', async () => {
    const controller = new AbortController();
    global.fetch = jest.fn().mockImplementation(() => {
      controller.abort();
      const e = new Error('aborted');
      e.name = 'AbortError';
      return Promise.reject(e);
    }) as any;
    await expect(searchFoodDatabase('oats', null, '1', controller.signal)).rejects.toThrow('aborted');
  });
});
