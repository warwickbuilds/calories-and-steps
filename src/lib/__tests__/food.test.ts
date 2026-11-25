import {
  averageLoggedCalories,
  caloriesHistory,
  caloriesSummary,
  dayLabel,
  formatAmount,
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
  });  it('keeps the unit of the newest serving', () => {
    const r = recentFoods([{ ...row('FitMilk', '2026-11-24T07:00:00Z', 108), grams: 250, unit: 'ml' }]);
    expect(r[0].unit).toBe('ml');
    expect(recentFoods([row('Oats', '2026-11-24T07:00:00Z')])[0].unit).toBe('g');
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
  it('keeps the unit', () => {
    const s = scaleNutrition({ calories: 108, proteinG: 13, carbsG: 6, fatG: 4, grams: 250, unit: 'ml' }, 2);
    expect(s.unit).toBe('ml');
    expect(s.grams).toBe(500);
  });
});

describe('formatAmount', () => {
  it('shows grams or ml', () => {
    expect(formatAmount(250, 'ml')).toBe('250 ml');
    expect(formatAmount(40.4, 'g')).toBe('40 g');
    expect(formatAmount(1500, undefined)).toBe('1,500 g');
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

  it('builds 7-day history with nulls for empty days and summarises against target', () => {
    const days = weekEndingOn('2026-11-24');
    const history = caloriesHistory(days, {
      '2026-11-22': 1950.4,
      '2026-11-23': 2250,
      '2026-11-24': 1800,
    });
    expect(history).toHaveLength(7);
    expect(history[0]).toEqual({ day: '2026-11-18', calories: null });
    expect(history[4]).toEqual({ day: '2026-11-22', calories: 1950 });
    expect(history[6]).toEqual({ day: '2026-11-24', calories: 1800 });

    expect(caloriesSummary(history, 2100)).toEqual({
      daysLogged: 3,
      average: 2000,
      daysOnTarget: 2,
      avgDelta: -100,
    });
    expect(caloriesSummary(caloriesHistory(days, {}), 2100)).toEqual({
      daysLogged: 0,
      average: null,
      daysOnTarget: 0,
      avgDelta: null,
    });
  });
});

describe('macroLine', () => {
  it('lists known macros only', () => {
    expect(macroLine({ proteinG: 31.6, carbsG: null, fatG: 4 })).toBe('P 32g · F 4g');
    expect(macroLine({ proteinG: null, carbsG: null, fatG: null })).toBe('');
  });
});
