import {
  averageLoggedCalories,
  dayLabel,
  macroLine,
  recentFoods,
  scaleNutrition,
  searchFoods,
  weekEndingOn,
  type LoggedFood,
} from '../food';

const row = (name: string, eatenAt: string, calories = 100): LoggedFood => ({
  name,
  eatenAt,
  calories,
  proteinG: 5,
  carbsG: 10,
  fatG: 2,
  grams: 50,
});

describe('recentFoods', () => {
  it('keeps one entry per name, newest serving first', () => {
    const r = recentFoods([
      row('Porridge', '2026-11-20T07:00:00Z', 300),
      row('porridge ', '2026-11-22T07:00:00Z', 350),
      row('Banana', '2026-11-21T10:00:00Z', 90),
    ]);
    expect(r.map((f) => f.name)).toEqual(['porridge', 'Banana']);
    expect(r[0].calories).toBe(350);
    expect(r[0].timesLogged).toBe(2);
  });

  it('skips generic quick adds and blank names', () => {
    const r = recentFoods([row('Quick add', '2026-11-22T07:00:00Z'), row('  ', '2026-11-22T08:00:00Z')]);
    expect(r).toEqual([]);
  });

  it('respects the limit', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`Food ${i}`, `2026-11-${10 + i}T07:00:00Z`));
    expect(recentFoods(rows, 3)).toHaveLength(3);
  });
});

describe('searchFoods', () => {
  const foods = [{ name: 'Greek yoghurt' }, { name: 'Chicken wrap' }, { name: 'Yoghurt with honey' }];
  it('matches every word in any order, ignoring case', () => {
    expect(searchFoods(foods, 'yoghurt GREEK').map((f) => f.name)).toEqual(['Greek yoghurt']);
    expect(searchFoods(foods, 'yog')).toHaveLength(2);
  });
  it('returns everything for an empty query', () => {
    expect(searchFoods(foods, '  ')).toHaveLength(3);
  });
});

describe('scaleNutrition', () => {
  it('scales calories, macros and grams', () => {
    const s = scaleNutrition({ calories: 250, proteinG: 10, carbsG: null, fatG: 4, grams: 120 }, 1.5);
    expect(s).toEqual({ calories: 375, proteinG: 15, carbsG: null, fatG: 6, grams: 180 });
  });
});

describe('dayLabel', () => {
  it('names nearby days', () => {
    expect(dayLabel('2026-11-24', '2026-11-24')).toBe('Today');
    expect(dayLabel('2026-11-23', '2026-11-24')).toBe('Yesterday');
    expect(dayLabel('2026-11-25', '2026-11-24')).toBe('Tomorrow');
  });
  it('uses a short date further away', () => {
    expect(dayLabel('2026-11-20', '2026-11-24')).toMatch(/^Fri .*20/);
    expect(dayLabel('2025-12-31', '2026-11-24')).toMatch(/2025/);
  });
});

describe('weekly average', () => {
  it('lists the seven days ending on a date', () => {
    const w = weekEndingOn('2026-11-03');
    expect(w).toHaveLength(7);
    expect(w[0]).toBe('2026-10-28');
    expect(w[6]).toBe('2026-11-03');
  });

  it('averages only days with food logged', () => {
    const days = weekEndingOn('2026-11-24');
    expect(averageLoggedCalories(days, { '2026-11-24': 2000, '2026-11-23': 1800, '2026-11-01': 5000 })).toEqual({
      average: 1900,
      daysLogged: 2,
    });
    expect(averageLoggedCalories(days, {})).toBeNull();
  });
});

describe('macroLine', () => {
  it('lists known macros only', () => {
    expect(macroLine({ proteinG: 31.6, carbsG: null, fatG: 4 })).toBe('P 32g · F 4g');
    expect(macroLine({ proteinG: null, carbsG: null, fatG: null })).toBe('');
  });
});
