import {
  changeRows,
  dailyWeights,
  inRange,
  milestones,
  periodChange,
  projectGoal,
  projectionLine,
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
  it('reports trend change and measures short histories from the first weigh-in', () => {
    const pts = withTrend(steadyLoss(40));
    const rows = changeRows(pts, today);
    expect(rows.map((r) => r.label)).toEqual(['Week', 'Month', '6 months', 'Year', 'All time']);
    expect(rows[0].kg).toBeLessThan(0);
    expect(rows[0].partial).toBe(false);
    expect(rows[1].kg).toBeLessThan(rows[0].kg!);
    // 40 days of history: 6 months and a year run from the first weigh-in, like All time.
    expect(rows[2].partial).toBe(true);
    expect(rows[2].fromDay).toBe(day(-39));
    expect(rows[3].kg).toBeCloseTo(rows[4].kg!);
    expect(rows[4].kg).toBeCloseTo(pts[pts.length - 1].trend - 90);
  });

  it('agrees with periodChange, which the header and chart use', () => {
    const pts = withTrend(steadyLoss(40));
    expect(changeRows(pts, today)[0].kg).toBe(periodChange(pts, 7, today).kg);
  });

  it('has nothing to say with a single weigh-in', () => {
    const pts = withTrend(steadyLoss(1));
    expect(periodChange(pts, 7, today).kg).toBeNull();
    expect(periodChange(pts, null, today).kg).toBeNull();
  });
});

describe('milestones', () => {
  it('lists every 5 kg reached on the trend, then the next one', () => {
    // 90 kg down 0.1 a day for 200 days: about 19 kg on the trend.
    const pts = withTrend(steadyLoss(200));
    const m = milestones(pts, 5);
    expect(m.map((x) => x.amountKg)).toEqual([5, 10, 15, 20]);
    expect(m.map((x) => x.weightKg)).toEqual([85, 80, 75, 70]);
    expect(m.slice(0, 3).every((x) => x.reachedDay != null)).toBe(true);
    expect(m[3].reachedDay).toBeNull();
    // The trend lags the readings a little, so 5 kg comes just after day 50.
    expect(m[0].reachedDay! > day(-200 + 50)).toBe(true);
  });

  it('counts up when gaining', () => {
    const gain = Array.from({ length: 120 }, (_, i) => ({ day: day(i - 119), kg: 60 + 0.1 * i }));
    const m = milestones(withTrend(gain), 5);
    expect(m[0].weightKg).toBe(65);
    expect(m[0].reachedDay).not.toBeNull();
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

  it('draws the projection to the goal, or stops early when asked', () => {
    const pts = withTrend(steadyLoss(120));
    const current = pts[pts.length - 1].trend;
    const full = projectionLine(pts, current - 5, null, today)!;
    expect(full.from.day).toBe(day(0));
    expect(full.to.kg).toBeCloseTo(current - 5);
    expect(full.cut).toBe(false);
    const short = projectionLine(pts, current - 5, 7, today)!;
    expect(short.to.day).toBe(day(7));
    expect(short.cut).toBe(true);
    expect(short.to.kg).toBeGreaterThan(current - 5);
    expect(projectionLine(pts, 100, null, today)).toBeNull();
  });
});
