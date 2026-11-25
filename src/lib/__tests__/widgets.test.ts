import {
  buildCaloriesWidgetProps,
  buildStepsWidgetProps,
  formatCompactCalories,
  formatCompactSteps,
} from '../widgets';

describe('1×1 widget compact formatters', () => {
  it('formats steps into ≤ 4 characters cleanly for a 1×1 ring', () => {
    expect(formatCompactSteps(0)).toBe('0');
    expect(formatCompactSteps(850)).toBe('850');
    expect(formatCompactSteps(999)).toBe('999');
    expect(formatCompactSteps(1000)).toBe('1k');
    expect(formatCompactSteps(1240)).toBe('1.2k');
    expect(formatCompactSteps(6420)).toBe('6.4k');
    expect(formatCompactSteps(9940)).toBe('9.9k');
    expect(formatCompactSteps(9950)).toBe('10k');
    expect(formatCompactSteps(10000)).toBe('10k');
    expect(formatCompactSteps(12340)).toBe('12k');
    expect(formatCompactSteps(25600)).toBe('26k');
  });

  it('formats calories into ≤ 4 characters without commas for a 1×1 ring', () => {
    expect(formatCompactCalories(0)).toBe('0');
    expect(formatCompactCalories(690)).toBe('690');
    expect(formatCompactCalories(1450)).toBe('1450');
    expect(formatCompactCalories(2100)).toBe('2100');
    expect(formatCompactCalories(9999)).toBe('9999');
    expect(formatCompactCalories(10000)).toBe('10k');
  });
});

describe('buildStepsWidgetProps', () => {
  it('handles missing steps gracefully', () => {
    expect(buildStepsWidgetProps(null, 10000, '2026-11-25')).toEqual({
      valueLabel: '–',
      label: 'STEPS',
      progress: 0,
      reached: false,
      updatedDay: '2026-11-25',
    });
  });

  it('computes compact count, progress, and target-hit state', () => {
    expect(buildStepsWidgetProps(6420, 10000, '2026-11-25')).toEqual({
      valueLabel: '6.4k',
      label: 'STEPS',
      progress: 0.642,
      reached: false,
      updatedDay: '2026-11-25',
    });

    expect(buildStepsWidgetProps(12340, 10000, '2026-11-25')).toEqual({
      valueLabel: '12k',
      label: 'STEPS',
      progress: 1,
      reached: true,
      updatedDay: '2026-11-25',
    });
  });
});

describe('buildCaloriesWidgetProps', () => {
  it('computes remaining calories and unified countdown progress', () => {
    const startOfDay = buildCaloriesWidgetProps(0, 2100, '2026-11-25');
    expect(startOfDay).toEqual({
      valueLabel: '2100',
      label: 'LEFT',
      progress: 1,
      over: false,
      updatedDay: '2026-11-25',
    });

    const under = buildCaloriesWidgetProps(1400, 2000, '2026-11-25');
    expect(under.valueLabel).toBe('600');
    expect(under.label).toBe('LEFT');
    expect(under.progress).toBeCloseTo(0.3, 5);
    expect(under.over).toBe(false);
  });

  it('switches cleanly into over-budget state with full danger progress', () => {
    const over = buildCaloriesWidgetProps(2250, 2000, '2026-11-25');
    expect(over).toEqual({
      valueLabel: '250',
      label: 'OVER',
      progress: 1,
      over: true,
      updatedDay: '2026-11-25',
    });
  });

  it('handles missing calorie target gracefully', () => {
    expect(buildCaloriesWidgetProps(0, 0, '2026-11-25')).toEqual({
      valueLabel: '–',
      label: 'CAL',
      progress: 0,
      over: false,
      updatedDay: '2026-11-25',
    });
  });
});
