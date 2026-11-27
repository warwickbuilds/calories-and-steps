import { averageOf, periodBars, periodDays } from '../chartPeriods';

describe('periodDays', () => {
  it('ends on the given day, oldest first', () => {
    const w = periodDays('1W', '2026-11-27');
    expect(w).toHaveLength(7);
    expect(w[0]).toBe('2026-11-21');
    expect(w[6]).toBe('2026-11-27');
    expect(periodDays('1Y', '2026-11-27')).toHaveLength(364);
  });
});

describe('periodBars', () => {
  const hist = (values: (number | null)[]) =>
    periodDays(values.length === 7 ? '1W' : '3M', '2026-11-27').map((day, i) => ({ day, value: values[i] }));

  it('keeps one bar per day for a week', () => {
    const bars = periodBars(hist([1, null, 3, 4, 5, 6, 7]), '1W');
    expect(bars).toHaveLength(7);
    expect(bars[1]).toEqual({ key: '2026-11-22', lastDay: '2026-11-22', value: null, daysWithData: 0 });
  });

  it('averages weeks for 3 months, ignoring missing days, ending on the last day', () => {
    const values = Array.from({ length: 91 }, (_, i) => (i >= 84 ? (i === 90 ? null : 1000) : 500));
    const bars = periodBars(hist(values), '3M');
    expect(bars).toHaveLength(13);
    expect(bars[12]).toMatchObject({ lastDay: '2026-11-27', value: 1000, daysWithData: 6 });
    expect(bars[0].value).toBe(500);
  });
});

describe('averageOf', () => {
  it('skips nulls and rounds', () => {
    expect(averageOf([1, null, 2])).toBe(2);
    expect(averageOf([null])).toBeNull();
  });
});
