/** Local-date helpers. Dates are stored as YYYY-MM-DD in the phone's time zone. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromLocalDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Start (inclusive) and end (exclusive) of a local day. */
export function dayBounds(d: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { start, end };
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}
