import {
  compareWithExisting,
  importTimestamp,
  inferYear,
  mergeRows,
  normaliseRows,
  type ParsedRow,
} from '../weightImport';

const today = new Date(2026, 10, 24, 9, 0); // 24 Nov 2026

describe('inferYear', () => {
  it('uses this year for dates up to today', () => {
    expect(inferYear(11, 24, today)).toBe(2026);
    expect(inferYear(1, 6, today)).toBe(2026);
  });
  it('uses last year for dates after today', () => {
    expect(inferYear(12, 30, today)).toBe(2025);
  });
  it('finds the last leap year for 29 February', () => {
    expect(inferYear(2, 29, today)).toBe(2024);
  });
});

describe('normaliseRows', () => {
  it('reads the Lose It! list rows', () => {
    const { rows, dropped } = normaliseRows(
      {
        rows: [
          { year: 2026, month: 11, day: 24, weight: 76.8, unit: 'kg', source: 'list' },
          { year: 2026, month: 11, day: 23, weight: 77.8, unit: 'kg', source: 'list' },
        ],
      },
      today,
    );
    expect(dropped).toBe(0);
    expect(rows).toEqual([
      { day: '2026-11-24', kg: 76.8, source: 'list', yearGuessed: false },
      { day: '2026-11-23', kg: 77.8, source: 'list', yearGuessed: false },
    ]);
  });

  it('converts pounds and fills in a missing year', () => {
    const { rows } = normaliseRows({ rows: [{ year: null, month: 12, day: 1, weight: 170, unit: 'lb', source: 'list' }] }, today);
    expect(rows[0]).toEqual({ day: '2025-12-01', kg: 77.11, source: 'list', yearGuessed: true });
  });

  it('drops future dates, impossible dates and impossible weights', () => {
    const { rows, dropped } = normaliseRows(
      {
        rows: [
          { year: 2026, month: 12, day: 2, weight: 76, unit: 'kg', source: 'list' },
          { year: 2026, month: 2, day: 30, weight: 76, unit: 'kg', source: 'list' },
          { year: 2026, month: 3, day: 1, weight: 7.6, unit: 'kg', source: 'list' },
          { year: 2026, month: 3, day: 1, weight: 'abc', unit: 'kg', source: 'list' },
          { year: 2026, month: 3, day: 1, weight: 80, unit: 'st', source: 'list' },
          { year: 2026, month: 3, day: 2, weight: 80, unit: 'kg', source: 'list' },
        ],
      },
      today,
    );
    expect(dropped).toBe(5);
    expect(rows.map((r) => r.day)).toEqual(['2026-03-02']);
  });

  it('copes with an answer that has no rows', () => {
    expect(normaliseRows(null, today)).toEqual({ rows: [], dropped: 0 });
    expect(normaliseRows({ rows: 'x' }, today)).toEqual({ rows: [], dropped: 0 });
  });
});

const row = (day: string, kg: number, source: 'list' | 'chart' = 'list'): ParsedRow => ({
  day,
  kg,
  source,
  yearGuessed: false,
});

describe('mergeRows', () => {
  it('removes overlap between screenshots and sorts newest first', () => {
    const merged = mergeRows([
      [row('2026-11-24', 76.8), row('2026-11-23', 77.8)],
      [row('2026-11-23', 77.8), row('2026-11-20', 77.3)],
    ]);
    expect(merged.map((m) => [m.day, m.kg])).toEqual([
      ['2026-11-24', 76.8],
      ['2026-11-23', 77.8],
      ['2026-11-20', 77.3],
    ]);
    expect(merged[1].otherReadings).toEqual([]);
  });

  it('prefers list rows over chart estimates for the same date', () => {
    const [m] = mergeRows([[row('2026-09-22', 80, 'chart')], [row('2026-09-22', 81.2)]]);
    expect(m).toMatchObject({ kg: 81.2, source: 'list' });
  });

  it('keeps the most common reading and reports the others', () => {
    const [m] = mergeRows([[row('2026-11-23', 77.8)], [row('2026-11-23', 71.8)], [row('2026-11-23', 77.8)]]);
    expect(m.kg).toBe(77.8);
    expect(m.otherReadings).toEqual([71.8]);
  });

  it('averages chart estimates for the same date', () => {
    const [m] = mergeRows([[row('2026-01-06', 97, 'chart')], [row('2026-01-06', 98, 'chart')]]);
    expect(m).toMatchObject({ kg: 97.5, source: 'chart' });
  });
});

describe('compareWithExisting', () => {
  const existing = [
    { id: 1, measuredAt: new Date(2026, 10, 24, 7).toISOString(), weightKg: 76.8 },
    { id: 2, measuredAt: new Date(2026, 10, 23, 7).toISOString(), weightKg: 77.0 },
    { id: 3, measuredAt: new Date(2026, 10, 23, 20).toISOString(), weightKg: 77.4 },
  ];

  it('marks new, same and different dates and only ticks new ones', () => {
    const rows = compareWithExisting(mergeRows([[row('2026-11-24', 76.8), row('2026-11-23', 77.8), row('2026-11-20', 77.3)]]), existing);
    expect(rows.map((r) => [r.day, r.status, r.selected, r.existingId])).toEqual([
      ['2026-11-24', 'same', false, 1],
      ['2026-11-23', 'different', false, 3],
      ['2026-11-20', 'new', true, null],
    ]);
    expect(rows[1].existingKg).toBe(77.4);
  });

  it('leaves chart estimates unticked when list rows were found', () => {
    const rows = compareWithExisting(mergeRows([[row('2026-11-20', 77.3), row('2026-01-06', 97, 'chart')]]), []);
    expect(rows.map((r) => r.selected)).toEqual([true, false]);
  });

  it('ticks chart estimates when they are all there is', () => {
    const rows = compareWithExisting(mergeRows([[row('2026-01-06', 97, 'chart')]]), []);
    expect(rows[0].selected).toBe(true);
  });
});

describe('importTimestamp', () => {
  it('stores at local midday on the date', () => {
    const d = new Date(importTimestamp('2026-03-29'));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 29, 12]);
  });
});
