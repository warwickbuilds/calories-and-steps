/**
 * Period picker maths for the Steps and Calories charts: which days a period
 * covers and how they are grouped into bars. Week and month show a bar per
 * day; 3 months shows weekly averages and a year shows 4-week averages, so
 * the bars stay wide enough to read and tap.
 */

import { addDays, formatShortDate, fromLocalDateString, toLocalDateString } from './dates';

export type ChartPeriod = '1W' | '1M' | '3M' | '1Y';

export const CHART_PERIODS: ChartPeriod[] = ['1W', '1M', '3M', '1Y'];

export const PERIOD_SPEC: Record<ChartPeriod, { days: number; bucket: number; title: string; short: string }> = {
  '1W': { days: 7, bucket: 1, title: '7 days', short: '7-day' },
  '1M': { days: 30, bucket: 1, title: '30 days', short: '30-day' },
  '3M': { days: 91, bucket: 7, title: '3 months', short: '3-month' },
  '1Y': { days: 364, bucket: 28, title: 'year', short: 'Year' },
};

export const PERIOD_OPTIONS = CHART_PERIODS.map((p) => ({ value: p, label: p }));

/** The days a period covers, oldest first, ending on `endDay`. */
export function periodDays(period: ChartPeriod, endDay: string): string[] {
  const { days } = PERIOD_SPEC[period];
  const end = fromLocalDateString(endDay);
  return Array.from({ length: days }, (_, i) => toLocalDateString(addDays(end, i - (days - 1))));
}

export interface PeriodBar {
  /** First day in the bar. */
  key: string;
  /** Last day in the bar (same as key for daily bars). */
  lastDay: string;
  /** The day's value, or the average of the days with data in the bucket; null when none have data. */
  value: number | null;
  /** Days in the bucket that have data. */
  daysWithData: number;
}

/**
 * Groups a daily history (oldest first) into bars for the period. Buckets are
 * counted back from the end, so the last bar always ends on the latest day.
 */
export function periodBars(history: { day: string; value: number | null }[], period: ChartPeriod): PeriodBar[] {
  const { bucket } = PERIOD_SPEC[period];
  const bars: PeriodBar[] = [];
  for (let end = history.length; end > 0; end -= bucket) {
    const chunk = history.slice(Math.max(0, end - bucket), end);
    const vals = chunk.map((d) => d.value).filter((v): v is number => v != null);
    bars.unshift({
      key: chunk[0].day,
      lastDay: chunk[chunk.length - 1].day,
      value: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null,
      daysWithData: vals.length,
    });
  }
  return bars;
}

/** Average of the days with data, rounded, or null. */
export function averageOf(values: (number | null)[]): number | null {
  const vals = values.filter((v): v is number => v != null);
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
}

const weekdayOf = (day: string) => fromLocalDateString(day).toLocaleDateString(undefined, { weekday: 'short' });
const monthOf = (day: string) => fromLocalDateString(day).toLocaleDateString(undefined, { month: 'short' });

/**
 * Labels under the chart. A week gets one per bar ("Mon" ... "Today"); longer
 * periods get five spread from left to right, ending on "Today" when the
 * last bar is today.
 */
export function periodAxisLabels(bars: PeriodBar[], period: ChartPeriod, today: string): string[] {
  if (period === '1W') return bars.map((b) => (b.key === today ? 'Today' : weekdayOf(b.key)));
  const n = bars.length;
  const picks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1)));
  return picks.map((i, j) => {
    const b = bars[i];
    if (j === picks.length - 1 && b.lastDay === today && period === '1M') return 'Today';
    // A 4-week bar is named by the month it ends in, so the last one is this month.
    if (period === '1Y') return monthOf(b.lastDay);
    return formatShortDate(fromLocalDateString(b.key));
  });
}

/** What the inspection pill says for a bar: "Today", "Wed 26 Nov" or "3 Nov – 9 Nov". */
export function periodBarLabel(bar: PeriodBar, today: string): string {
  if (bar.key === bar.lastDay) {
    return bar.key === today
      ? 'Today'
      : fromLocalDateString(bar.key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return `${formatShortDate(fromLocalDateString(bar.key))} – ${formatShortDate(fromLocalDateString(bar.lastDay))}`;
}
