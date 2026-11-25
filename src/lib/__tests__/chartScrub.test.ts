import { barIndexAtX, nearestPointIndex } from '../chartScrub';

describe('nearestPointIndex', () => {
  it('returns null for empty or non-finite input', () => {
    expect(nearestPointIndex([], 50)).toBeNull();
    expect(nearestPointIndex([10, 20], Number.NaN)).toBeNull();
  });

  it('picks the closest x coordinate including edges', () => {
    const xs = [30, 80, 140, 200];
    expect(nearestPointIndex(xs, 0)).toBe(0);
    expect(nearestPointIndex(xs, 54)).toBe(0);
    expect(nearestPointIndex(xs, 56)).toBe(1);
    expect(nearestPointIndex(xs, 138)).toBe(2);
    expect(nearestPointIndex(xs, 260)).toBe(3);
  });
});

describe('barIndexAtX', () => {
  it('returns null for empty or invalid plot width', () => {
    expect(barIndexAtX(0, 50, 34, 280)).toBeNull();
    expect(barIndexAtX(7, 50, 34, 0)).toBeNull();
  });

  it('maps touches to the right bar slot and clamps small edge slop', () => {
    // 7 bars over 280px starting at x=34 => 40px per bar
    expect(barIndexAtX(7, 34 + 5, 34, 280)).toBe(0);
    expect(barIndexAtX(7, 34 + 41, 34, 280)).toBe(1);
    expect(barIndexAtX(7, 34 + 279, 34, 280)).toBe(6);
    // Small touch slop at edges clamps cleanly
    expect(barIndexAtX(7, 26, 34, 280)).toBe(0);
    expect(barIndexAtX(7, 322, 34, 280)).toBe(6);
    // Far outside plot returns null
    expect(barIndexAtX(7, 5, 34, 280)).toBeNull();
    expect(barIndexAtX(7, 350, 34, 280)).toBeNull();
  });
});
