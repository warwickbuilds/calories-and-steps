import { GOAL_MODES, ageOn, bmr, dailyTargets } from '../energy';

describe('ageOn', () => {
  it('counts birthdays correctly', () => {
    expect(ageOn('1990-06-15', new Date(2026, 5, 14))).toBe(35);
    expect(ageOn('1990-06-15', new Date(2026, 5, 15))).toBe(36);
  });
});

describe('bmr (Mifflin-St Jeor)', () => {
  it('matches the published formula', () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 1780
    expect(bmr('male', 80, 180, 30)).toBeCloseTo(1780);
    // 10×60 + 6.25×165 − 5×30 − 161 = 1320.25
    expect(bmr('female', 60, 165, 30)).toBeCloseTo(1320.25);
  });
});

describe('goal offsets', () => {
  it('are flat daily amounts from maintenance', () => {
    expect(GOAL_MODES.hard_cut.offset).toBe(-800);
    expect(GOAL_MODES.steady_cut.offset).toBe(-500);
    expect(GOAL_MODES.maintain.offset).toBe(0);
    expect(GOAL_MODES.bulk.offset).toBe(500);
  });
});

describe('dailyTargets', () => {
  const base = { sex: 'male' as const, weightKg: 80, heightCm: 180, age: 30, activity: 'moderate' as const };

  it('applies the goal offset to maintenance', () => {
    const maintain = dailyTargets({ ...base, goal: 'maintain' });
    expect(maintain.maintenance).toBe(Math.round(1780 * 1.55)); // 2759
    expect(maintain.calories).toBe(2759);
    expect(dailyTargets({ ...base, goal: 'steady_cut' }).calories).toBe(2259);
    expect(dailyTargets({ ...base, goal: 'hard_cut' }).calories).toBe(1959);
    expect(dailyTargets({ ...base, goal: 'bulk' }).calories).toBe(3259);
  });

  it('never goes below the safe floor', () => {
    const t = dailyTargets({
      sex: 'female',
      weightKg: 50,
      heightCm: 155,
      age: 60,
      activity: 'sedentary',
      goal: 'hard_cut',
    });
    expect(t.calories).toBe(1200);
    expect(t.flooredAtMinimum).toBe(true);
  });

  it('splits macros: 2 g/kg protein, 25% fat, carbs the rest', () => {
    const t = dailyTargets({ ...base, goal: 'maintain' });
    expect(t.proteinG).toBe(160);
    expect(t.fatG).toBe(Math.round((2759 * 0.25) / 9));
    expect(t.carbsG).toBe(Math.round((2759 - 160 * 4 - t.fatG * 9) / 4));
  });

  it('honours macro overrides', () => {
    const t = dailyTargets({ ...base, goal: 'maintain', macros: { proteinGPerKg: 1.6, fatPct: 0.3 } });
    expect(t.proteinG).toBe(128);
    expect(t.fatG).toBe(Math.round((2759 * 0.3) / 9));
  });
});
