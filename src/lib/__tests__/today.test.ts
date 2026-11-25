import { caloriesReadout, changeParts, macroSplit, stepsToGo, todayWeightChanges, weeklyChangeText } from '../today';

describe('caloriesReadout', () => {
  it('shows calories left', () => {
    const r = caloriesReadout(1460, 2150);
    expect(r.headline).toBe('690');
    expect(r.caption).toBe('1,460 eaten of 2,150');
    expect(r.over).toBe(false);
    expect(r.progress).toBeCloseTo(1460 / 2150);
  });

  it('shows calories over and keeps the ring full', () => {
    const r = caloriesReadout(2270, 2150);
    expect(r.headline).toBe('120 over');
    expect(r.over).toBe(true);
    expect(r.progress).toBe(1);
  });

  it('never says kcal', () => {
    expect(JSON.stringify(caloriesReadout(500, 2000))).not.toMatch(/kcal/i);
  });
});

describe('weekly weight change text', () => {
  it('rounds to one decimal and says which way', () => {
    expect(weeklyChangeText(-0.3)).toBe('0.3 down this week');
    expect(weeklyChangeText(0.52)).toBe('0.5 up this week');
    expect(weeklyChangeText(0.01)).toBe('No change this week');
    expect(weeklyChangeText(null)).toBeNull();
  });
});

describe('calories countdown', () => {
  it('starts full and empties as you eat', () => {
    expect(caloriesReadout(0, 2000).remaining).toBe(1);
    expect(caloriesReadout(500, 2000).remaining).toBeCloseTo(0.75);
    expect(caloriesReadout(500, 2000).status).toBe('left');
  });

  it('is empty and says over past the target', () => {
    const r = caloriesReadout(2100, 2000);
    expect(r.remaining).toBe(0);
    expect(r.status).toBe('over');
    expect(r.value).toBe(100);
  });
});

describe('macroSplit', () => {
  it('sizes each macro by the calories it gave', () => {
    const s = macroSplit({ proteinG: 25, carbsG: 25, fatG: 10 }, { proteinG: 150, carbsG: 200, fatG: 60 });
    // 100 + 100 + 90 = 290 calories
    expect(s.map((m) => m.key)).toEqual(['protein', 'carbs', 'fat']);
    expect(s[0].share).toBeCloseTo(100 / 290);
    expect(s[2].share).toBeCloseTo(90 / 290);
    expect(s[0].target).toBe(150);
  });

  it('is all zero before anything is logged', () => {
    const s = macroSplit({ proteinG: 0, carbsG: 0, fatG: 0 }, null);
    expect(s.every((m) => m.share === 0 && m.target === 0)).toBe(true);
  });
});

describe('todayWeightChanges', () => {
  const today = new Date(2026, 10, 25, 9);
  const points = [
    { day: '2026-08-01', kg: 100 },
    { day: '2026-08-25', kg: 98 },
    { day: '2026-10-25', kg: 92 },
    { day: '2026-11-18', kg: 90 },
    { day: '2026-11-25', kg: 89.2 },
  ];

  it('uses actual weigh-ins for 7 days, 1 month and 3 months', () => {
    const t = todayWeightChanges(points, today);
    expect(t.map((x) => x.label)).toEqual(['7 days', '1 month', '3 months']);
    expect(t[0].kg).toBeCloseTo(-0.8);
    expect(t[1].kg).toBeCloseTo(-2.8);
    expect(t[2].kg).toBeCloseTo(-8.8);
    expect(t.every((x) => !x.partial)).toBe(true);
  });

  it('measures from the first weigh-in when history is short', () => {
    const t = todayWeightChanges(points.slice(3), today);
    expect(t[2].kg).toBeCloseTo(-0.8);
    expect(t[2].partial).toBe(true);
  });

  it('has nothing to show with one weigh-in', () => {
    expect(todayWeightChanges(points.slice(4), today).every((x) => x.kg == null)).toBe(true);
  });
});

describe('changeParts and stepsToGo', () => {
  it('rounds to one decimal with a direction', () => {
    expect(changeParts(-1.24)).toEqual({ amount: '1.2', direction: 'down' });
    expect(changeParts(0.56)).toEqual({ amount: '0.6', direction: 'up' });
    expect(changeParts(0.02)).toEqual({ amount: '0.0', direction: 'same' });
    expect(changeParts(null)).toBeNull();
  });

  it('counts steps to go', () => {
    expect(stepsToGo(6580, 10000)).toBe('3,420 to go');
    expect(stepsToGo(10200, 10000)).toBe('Target hit');
  });
});
