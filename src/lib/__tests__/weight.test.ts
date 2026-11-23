import {
  changeRows,
  dailyWeights,
  inRange,
  projectGoal,
  rateNeededPerWeek,
  trendSlope,
  withTrend,
  type WeightPoint,
} from '../weight';

const today = new Date(2026, 10, 23); // 23 Nov 2026
const day = (offset: number) => {
  const d = new Date(2026, 10, 23 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A steady loss of 0.1 kg a day for `n` days ending today. */
const steadyLoss = (n: number, start = 90): WeightPoint[] =>
  Array.from({ length: n }, (_, i) => ({ day: day(i - (n - 1)), kg: start - 0.1 * i }));

describe('dailyWeights', () => {
  it('averages entries on the same local day and sorts oldest first', () => {
    const at = (offset: number, h: number) => new Date(2026, 10, 23 + offset, h).toISOString();
    const out = dailyWeights([
      { measuredAt: at(0, 8), weightKg: 80 },
      { measuredAt: at(-1, 8), weightKg: 81 },
      { measuredAt: at(0, 20), weightKg: 81 },
    ]);
    expect(out).toEqual([
      { day: day(-1), kg: 81 },
      { day: day(0), kg: 80.5 },
    ]);
  });
});

describe('withTrend', () => {
  it('starts at the first reading and smooths spikes', () => {
    const t = withTrend([
      { day: day(-2), kg: 80 },
      { day: day(-1), kg: 82 },
      { day: day(0), kg: 80 },
    ]);
    expect(t[0].trend).toBe(80);
    expect(t[1].trend).toBeCloseTo(80.2);
    expect(t[2].trend).toBeCloseTo(80.18);
  });

  it('applies one step per missing day', () => {
    const t = withTrend([
      { day: day(-3), kg: 80 },
      { day: day(0), kg: 70 },
    ]);
    expect(t[1].trend).toBeCloseTo(70 + 10 * 0.9 ** 3);
  });
});

describe('inRange', () => {
  it('keeps points inside the window', () => {
    const pts = steadyLoss(40);
    expect(inRange(pts, '1W', today)).toHaveLength(8);
    expect(inRange(pts, 'All', today)).toHaveLength(40);
  });
});

describe('changeRows', () => {
  it('reports trend change and hides periods older than the history', () => {
    const pts = withTrend(steadyLoss(40));
    const rows = changeRows(pts, today);
    expect(rows.map((r) => r.label)).toEqual(['Week', 'Month', '6 months', 'Year', 'All time']);
    expect(rows[0].kg).toBeLessThan(0);
    expect(rows[1].kg).toBeLessThan(rows[0].kg!);
    expect(rows[2].kg).toBeNull();
    expect(rows[4].kg).toBeCloseTo(pts[pts.length - 1].trend - 90);
  });
});

describe('projection', () => {
  it('finds the slope of a steady loss', () => {
    // The trend lags early on, so measure once it has settled.
    const pts = withTrend(steadyLoss(120));
    expect(trendSlope(pts, 28, today)).toBeCloseTo(-0.1, 2);
  });

  it('projects a date for a goal in the direction of travel', () => {
    const pts = withTrend(steadyLoss(120));
    const current = pts[pts.length - 1].trend;
    const p = projectGoal(pts, current - 5, today);
    expect(p.kind).toBe('on-track');
    if (p.kind === 'on-track') expect(p.days).toBeGreaterThanOrEqual(49);
    if (p.kind === 'on-track') expect(p.days).toBeLessThanOrEqual(51);
  });

  it('says so when moving away from the goal or without enough data', () => {
    const pts = withTrend(steadyLoss(120));
    expect(projectGoal(pts, 100, today).kind).toBe('wrong-way');
    expect(projectGoal(withTrend(steadyLoss(3)), 70, today).kind).toBe('not-enough-data');
    expect(projectGoal(pts, null, today).kind).toBe('no-goal');
    expect(projectGoal(pts, pts[pts.length - 1].trend + 0.1, today).kind).toBe('reached');
  });

  it('works out the weekly rate needed for a target date', () => {
    expect(rateNeededPerWeek(80, 76, day(28), today)).toBeCloseTo(-1);
    expect(rateNeededPerWeek(80, 76, day(-1), today)).toBeNull();
  });
});
