import { caloriesReadout, weeklyChangeText } from '../today';

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
