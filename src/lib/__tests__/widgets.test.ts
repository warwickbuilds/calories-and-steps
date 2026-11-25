import {
  buildCaloriesWidgetProps,
  buildStepsWidgetProps,
  formatCompactCount,
  formatCompactTarget,
} from '../widgets';

describe('widget compact formatters', () => {
  it('keeps exact numbers under 10k and shortens 10k+ cleanly for tight circles', () => {
    expect(formatCompactCount(0)).toBe('0');
    expect(formatCompactCount(6420)).toBe('6,420');
    expect(formatCompactCount(9999)).toBe('9,999');
    expect(formatCompactCount(10000)).toBe('10k');
    expect(formatCompactCount(10420)).toBe('10.4k');
  });

  it('formats compact targets cleanly', () => {
    expect(formatCompactTarget(800)).toBe('800');
    expect(formatCompactTarget(10000)).toBe('10k');
    expect(formatCompactTarget(7500)).toBe('7.5k');
  });
});

describe('buildStepsWidgetProps', () => {
  it('handles missing steps gracefully', () => {
    expect(buildStepsWidgetProps(null, 10000, '2026-11-25')).toEqual({
      valueLabel: '–',
      subLabel: 'of 10k',
      progress: 0,
      reached: false,
      updatedDay: '2026-11-25',
    });
  });

  it('computes progress and target-hit state', () => {
    expect(buildStepsWidgetProps(6420, 10000, '2026-11-25')).toEqual({
      valueLabel: '6,420',
      subLabel: 'of 10k',
      progress: 0.642,
      reached: false,
      updatedDay: '2026-11-25',
    });

    expect(buildStepsWidgetProps(12340, 10000, '2026-11-25')).toEqual({
      valueLabel: '12.3k',
      subLabel: 'Target hit',
      progress: 1,
      reached: true,
      updatedDay: '2026-11-25',
    });
  });
});

describe('buildCaloriesWidgetProps', () => {
  it('computes remaining calories, ring progress, and eaten bar progress', () => {
    const under = buildCaloriesWidgetProps(1400, 2000, '2026-11-25');
    expect(under.valueLabel).toBe('600');
    expect(under.statusLabel).toBe('left');
    expect(under.subLabel).toBe('1,400 / 2,000');
    expect(under.remainingProgress).toBeCloseTo(0.3, 5);
    expect(under.eatenProgress).toBeCloseTo(0.7, 5);
    expect(under.over).toBe(false);
  });

  it('switches cleanly into over-budget state', () => {
    const over = buildCaloriesWidgetProps(2250, 2000, '2026-11-25');
    expect(over).toEqual({
      valueLabel: '250',
      statusLabel: 'over',
      subLabel: '2,250 / 2,000',
      remainingProgress: 1,
      eatenProgress: 1,
      over: true,
      updatedDay: '2026-11-25',
    });
  });

  it('handles missing calorie target gracefully', () => {
    expect(buildCaloriesWidgetProps(0, 0, '2026-11-25')).toEqual({
      valueLabel: '–',
      statusLabel: 'calories',
      subLabel: 'Open app',
      remainingProgress: 0,
      eatenProgress: 0,
      over: false,
      updatedDay: '2026-11-25',
    });
  });
});
