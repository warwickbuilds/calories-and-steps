import { msUntilMidnight } from '../dates';

describe('msUntilMidnight', () => {
  it('returns milliseconds until 1s after the next local midnight', () => {
    const justBefore = new Date(2026, 10, 24, 23, 59, 50, 0);
    expect(msUntilMidnight(justBefore)).toBe(11_000);

    const noon = new Date(2026, 10, 24, 12, 0, 0, 0);
    expect(msUntilMidnight(noon)).toBe(12 * 60 * 60 * 1000 + 1000);
  });

  it('never returns less than 1000 ms', () => {
    const midnight = new Date(2026, 10, 24, 0, 0, 0, 0);
    expect(msUntilMidnight(midnight)).toBeGreaterThanOrEqual(1000);
  });
});
