import { buildRequest } from '../providers';
import { mealEstimatePrompt, mealEstimateRequest, parseMealAnswer, totalOf } from '../mealEstimate';

describe('meal estimate request', () => {
  it('puts the description in the prompt and the photo in the request', () => {
    const req = mealEstimateRequest({ image: { mimeType: 'image/jpeg', base64: 'AAA' }, description: 'half the rice' });
    expect(req.prompt).toContain('"""half the rice"""');
    expect(req.prompt).toContain('The photo shows the meal.');
    expect(req.images).toHaveLength(1);
    const http = buildRequest('gemini', 'gemini-3.6-flash', 'k', req);
    expect((http.body as any).contents[0].parts[0].inline_data.data).toBe('AAA');
  });

  it('works from a description alone', () => {
    const req = mealEstimateRequest({ image: null, description: 'two eggs on toast' });
    expect(req.images).toEqual([]);
    expect(req.prompt).toContain('no photo');
  });

  it('caps a very long description', () => {
    expect(mealEstimatePrompt('x'.repeat(5000), true).length).toBeLessThan(4000);
  });
});

describe('parseMealAnswer', () => {
  it('keeps valid items and rounds them', () => {
    const r = parseMealAnswer({
      isFood: true,
      mealName: 'Chicken and rice',
      items: [
        { name: 'rice', grams: 180.4, calories: 234.6, protein: 4.33, carbs: 51, fat: 0.5, confidence: 'medium' },
        { name: 'Chicken breast', grams: 150, calories: 248, protein: 46, carbs: 0, fat: 5.4, confidence: 'high' },
      ],
    });
    expect(r?.mealName).toBe('Chicken and rice');
    expect(r?.items[0]).toEqual({
      name: 'Rice',
      grams: 180,
      unit: 'g',
      calories: 235,
      proteinG: 4.3,
      carbsG: 51,
      fatG: 0.5,
      confidence: 'medium',
    });
  });

  it('drops bad items and returns null when nothing is left', () => {
    expect(
      parseMealAnswer({ isFood: true, mealName: 'x', items: [{ name: '', grams: 1, calories: 1 }, { name: 'a', grams: -1, calories: 5 }] }),
    ).toBeNull();
    expect(parseMealAnswer({ isFood: false, mealName: '', items: [] })).toBeNull();
    expect(parseMealAnswer(null)).toBeNull();
  });

  it('keeps ml for drinks', () => {
    const r = parseMealAnswer({
      isFood: true,
      mealName: 'Flat white',
      items: [{ name: 'Flat white', grams: 220, unit: 'ml', calories: 110, protein: 6, carbs: 9, fat: 5.5, confidence: 'high' }],
    });
    expect(r?.items[0].unit).toBe('ml');
    expect(r?.items[0].grams).toBe(220);
  });

  it('falls back to the first item for a missing meal name', () => {
    const r = parseMealAnswer({ isFood: true, mealName: ' ', items: [{ name: 'Apple', grams: 150, calories: 78, protein: 0.4, carbs: 21, fat: 0.3, confidence: 'x' }] });
    expect(r?.mealName).toBe('Apple');
    expect(r?.items[0].confidence).toBe('medium');
  });
});

describe('totalOf', () => {
  it('adds items, treating missing macros as zero', () => {
    expect(totalOf([{ calories: 100, proteinG: 5, carbsG: null, fatG: 1 }, { calories: 50, proteinG: null, carbsG: 10, fatG: null }])).toEqual({
      calories: 150,
      proteinG: 5,
      carbsG: 10,
      fatG: 1,
    });
  });
});
