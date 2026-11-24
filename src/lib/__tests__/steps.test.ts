import {
  accessMessage,
  bucketsToDays,
  hourlyFromBuckets,
  stepsHistory,
  stepsSummary,
  syncWindow,
  syncedText,
  totalSteps,
} from '../steps';

describe('syncWindow', () => {
  it('runs from midnight 29 days ago to midnight tonight', () => {
    const { start, end } = syncWindow(new Date(2026, 10, 24, 15, 30));
    expect(start).toEqual(new Date(2026, 9, 26));
    expect(end).toEqual(new Date(2026, 10, 25));
  });
});

describe('bucketsToDays', () => {
  it('keeps days with data, rounds, and sorts', () => {
    expect(
      bucketsToDays([
        { startTime: '2026-11-24T00:00', steps: 4210.6, origins: ['com.google.android.apps.fitness'] },
        { startTime: '2026-11-22T00:00', steps: 0, origins: [] },
        { startTime: '2026-11-23T00:00', steps: 0, origins: ['com.sec.android.app.shealth'] },
      ]),
    ).toEqual([
      { day: '2026-11-23', steps: 0 },
      { day: '2026-11-24', steps: 4211 },
    ]);
  });

  it('accepts full ISO start times and skips junk', () => {
    expect(
      bucketsToDays([
        { startTime: '2026-11-20T00:00:00', steps: 900, origins: [] },
        { startTime: 'nonsense', steps: 100, origins: ['x'] },
      ]),
    ).toEqual([{ day: '2026-11-20', steps: 900 }]);
  });
});

describe('stepsHistory', () => {
  it('fills the last n days oldest first with nulls for gaps', () => {
    const h = stepsHistory(
      [
        { day: '2026-11-24', steps: 5000 },
        { day: '2026-11-22', steps: 12000 },
      ],
      '2026-11-24',
      3,
    );
    expect(h).toEqual([
      { day: '2026-11-22', steps: 12000 },
      { day: '2026-11-23', steps: null },
      { day: '2026-11-24', steps: 5000 },
    ]);
  });

  it('crosses month ends', () => {
    expect(stepsHistory([], '2026-12-01', 2).map((d) => d.day)).toEqual(['2026-11-30', '2026-12-01']);
  });
});

describe('stepsSummary', () => {
  const day = (d: number, steps: number | null) => ({ day: `2026-11-${String(d).padStart(2, '0')}`, steps });

  it('averages days with data and counts days on target', () => {
    const s = stepsSummary([day(20, 8000), day(21, null), day(22, 12000), day(23, 10000)], 10000);
    expect(s.average).toBe(10000);
    expect(s.daysOnTarget).toBe(2);
    expect(s.daysWithData).toBe(3);
    expect(s.best).toEqual({ day: '2026-11-22', steps: 12000 });
  });

  it('does not break the streak for an unfinished today', () => {
    expect(stepsSummary([day(21, 11000), day(22, 10500), day(23, 3000)], 10000).streak).toBe(2);
    expect(stepsSummary([day(21, 11000), day(22, 10500), day(23, 10000)], 10000).streak).toBe(3);
    expect(stepsSummary([day(21, 11000), day(22, 500), day(23, 12000)], 10000).streak).toBe(1);
  });

  it('handles no data', () => {
    expect(stepsSummary([day(23, null)], 10000)).toEqual({
      average: null,
      daysOnTarget: 0,
      daysWithData: 0,
      best: null,
      streak: 0,
    });
  });
});

describe('accessMessage', () => {
  it('offers the right action for each state', () => {
    expect(accessMessage('granted').action).toBeNull();
    expect(accessMessage('not-granted').action).toBe('Connect Health Connect');
    expect(accessMessage('not-installed').action).toBe('Get Health Connect');
    expect(accessMessage('update-required').action).toBe('Update Health Connect');
  });
});

describe('syncedText', () => {
  const now = new Date(2026, 10, 24, 15, 0);
  it('describes how long ago', () => {
    expect(syncedText(null, now)).toBeNull();
    expect(syncedText(new Date(2026, 10, 24, 14, 59, 30), now)).toBe('Updated just now');
    expect(syncedText(new Date(2026, 10, 24, 14, 50), now)).toBe('Updated 10 min ago');
    expect(syncedText(new Date(2026, 10, 24, 9, 5), now)).toBe('Updated at 09:05');
    expect(syncedText(new Date(2026, 10, 22, 9, 5), now)).toMatch(/^Updated .*22/);
  });
});

describe('hourlyFromBuckets', () => {
  it('puts each bucket in its local hour and ignores other days', () => {
    const at = (h: number, d = 24) => new Date(2026, 10, d, h).toISOString();
    const hours = hourlyFromBuckets(
      [
        { startTime: at(8), steps: 1200.4 },
        { startTime: at(17), steps: 3000 },
        { startTime: at(23, 23), steps: 999 },
        { startTime: 'bad', steps: 5 },
      ],
      '2026-11-24',
    );
    expect(hours).toHaveLength(24);
    expect(hours[8]).toBe(1200);
    expect(hours[17]).toBe(3000);
    expect(hours.reduce((a, b) => a + b, 0)).toBe(4200);
  });
});

describe('totalSteps', () => {
  it('adds the days with data', () => {
    expect(totalSteps([{ steps: 1000 }, { steps: null }, { steps: 2500 }])).toBe(3500);
    expect(totalSteps([{ steps: null }])).toBeNull();
  });
});

describe('accessMessage', () => {
  it('returns a retry prompt for transient Health Connect errors instead of Play Store install', () => {
    const msg = accessMessage('error');
    expect(msg.action).toBe('Try again');
    expect(msg.title).toMatch(/Health Connect/i);
  });
});
