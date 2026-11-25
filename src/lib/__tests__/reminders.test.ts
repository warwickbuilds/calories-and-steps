import {
  DEFAULT_REMINDERS,
  anyReminderEnabled,
  buildReminderSchedule,
  formatReminderTime,
  isCompletedToday,
  parseNotificationRoute,
  parseReminderSettings,
  type ReminderSettings,
  type TodayCompletion,
} from '../reminders';

const EMPTY_TODAY: TodayCompletion = { weighedIn: false, mealsLogged: new Set() };

describe('parseReminderSettings', () => {
  it('returns defaults for null, invalid, or partial input and clamps times', () => {
    expect(parseReminderSettings(null)).toEqual(DEFAULT_REMINDERS);
    expect(parseReminderSettings('corrupt')).toEqual(DEFAULT_REMINDERS);
    const parsed = parseReminderSettings({
      lunch: { enabled: true, hour: 29, minute: -5 },
      weigh_in: { enabled: true, hour: 6, minute: 45 },
    });
    expect(parsed.lunch).toEqual({ enabled: true, hour: 23, minute: 0 });
    expect(parsed.weigh_in).toEqual({ enabled: true, hour: 6, minute: 45 });
    expect(parsed.dinner).toEqual(DEFAULT_REMINDERS.dinner);
    expect(anyReminderEnabled(parsed)).toBe(true);
    expect(anyReminderEnabled(DEFAULT_REMINDERS)).toBe(false);
  });
});

describe('formatReminderTime', () => {
  it('formats 24-hour times cleanly in 12-hour format', () => {
    expect(formatReminderTime(0, 0)).toBe('12:00 AM');
    expect(formatReminderTime(7, 30)).toBe('7:30 AM');
    expect(formatReminderTime(12, 5)).toBe('12:05 PM');
    expect(formatReminderTime(13, 30)).toBe('1:30 PM');
    expect(formatReminderTime(21, 0)).toBe('9:00 PM');
  });
});

describe('buildReminderSchedule', () => {
  it('returns nothing when all reminders are off', () => {
    const now = new Date(2026, 10, 25, 8, 0, 0);
    expect(buildReminderSchedule(DEFAULT_REMINDERS, EMPTY_TODAY, now)).toEqual([]);
  });

  it('skips past times today and schedules tomorrow through horizon', () => {
    const settings: ReminderSettings = {
      ...DEFAULT_REMINDERS,
      weigh_in: { enabled: true, hour: 7, minute: 30 },
      lunch: { enabled: true, hour: 13, minute: 30 },
    };
    // 10:00 AM: weigh-in (7:30) already passed today, lunch (13:30) is still ahead
    const now = new Date(2026, 10, 25, 10, 0, 0);
    const items = buildReminderSchedule(settings, EMPTY_TODAY, now, 3);

    const weighIns = items.filter((i) => i.id === 'weigh_in');
    const lunches = items.filter((i) => i.id === 'lunch');
    expect(weighIns.map((i) => i.day)).toEqual(['2026-11-26', '2026-11-27']);
    expect(lunches.map((i) => i.day)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
    // Sorted chronologically
    for (let i = 1; i < items.length; i++) {
      expect(items[i].fireAt.getTime()).toBeGreaterThanOrEqual(items[i - 1].fireAt.getTime());
    }
  });

  it('smart-skips today when weigh-in or meal is already logged, while keeping future days armed', () => {
    const settings: ReminderSettings = {
      ...DEFAULT_REMINDERS,
      weigh_in: { enabled: true, hour: 9, minute: 0 },
      breakfast: { enabled: true, hour: 9, minute: 30 },
      lunch: { enabled: true, hour: 13, minute: 30 },
      evening: { enabled: true, hour: 21, minute: 0 },
    };
    const now = new Date(2026, 10, 25, 8, 0, 0);
    const today: TodayCompletion = {
      weighedIn: true,
      mealsLogged: new Set(['breakfast']),
    };

    expect(isCompletedToday('weigh_in', today)).toBe(true);
    expect(isCompletedToday('breakfast', today)).toBe(true);
    expect(isCompletedToday('lunch', today)).toBe(false);
    expect(isCompletedToday('evening', today)).toBe(false);

    const items = buildReminderSchedule(settings, today, now, 3);
    expect(items.filter((i) => i.id === 'weigh_in').map((i) => i.day)).toEqual(['2026-11-26', '2026-11-27']);
    expect(items.filter((i) => i.id === 'breakfast').map((i) => i.day)).toEqual(['2026-11-26', '2026-11-27']);
    expect(items.filter((i) => i.id === 'lunch').map((i) => i.day)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
    expect(items.filter((i) => i.id === 'evening').map((i) => i.day)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
  });
});

describe('parseNotificationRoute', () => {
  it('accepts known internal reminder routes and rejects unknown payloads', () => {
    expect(parseNotificationRoute({ route: '/add-food?meal=dinner' })).toBe('/add-food?meal=dinner');
    expect(parseNotificationRoute({ route: '/(tabs)/weight' })).toBe('/(tabs)/weight');
    expect(parseNotificationRoute({ route: '/(tabs)' })).toBe('/(tabs)');
    expect(parseNotificationRoute({ route: 'https://evil.example' })).toBeNull();
    expect(parseNotificationRoute(null)).toBeNull();
  });
});
