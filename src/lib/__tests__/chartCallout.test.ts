import { CALLOUT, placeCallout } from '@/lib/chartCallout';

const bounds = { left: 30, right: 330, top: 0, bottom: 216 };

describe('placeCallout', () => {
  it('sits above the point, centred on it', () => {
    const c = placeCallout(180, 100, '82.4', bounds, []);
    expect(c.below).toBe(false);
    expect(c.y + CALLOUT.h).toBeLessThan(100);
    expect(c.x + c.w / 2).toBeCloseTo(180);
    expect(c.tipX).toBe(180);
  });

  it('stays inside the chart at the edges, with the pointer still on the point', () => {
    const left = placeCallout(31, 100, '97.0', bounds, []);
    expect(left.x).toBe(30);
    expect(left.tipX).toBeGreaterThanOrEqual(left.x + 6);
    const right = placeCallout(330, 100, '76.8', bounds, []);
    expect(right.x + right.w).toBe(330);
    expect(right.tipX).toBeLessThanOrEqual(right.x + right.w - 6);
  });

  it('moves below the point when a milestone label is in the way', () => {
    const c = placeCallout(180, 100, '85.0', bounds, [{ x0: 170, x1: 196, y0: 70, y1: 95 }]);
    expect(c.below).toBe(true);
    expect(c.y).toBeGreaterThan(100);
  });

  it('stays above when below would run off the chart', () => {
    const c = placeCallout(180, 210, '75.0', bounds, [{ x0: 170, x1: 196, y0: 180, y1: 205 }]);
    expect(c.below).toBe(false);
  });
});

describe('placeCallout sideways', () => {
  it('leans sideways above the point before dropping below it', () => {
    // A milestone label just left of the point, above it.
    const c = placeCallout(200, 100, '76.8', bounds, [{ x0: 160, x1: 190, y0: 70, y1: 95 }]);
    expect(c.below).toBe(false);
    expect(c.x).toBeGreaterThanOrEqual(190);
    expect(c.tipX).toBe(200);
  });

  it('keeps off a goal line just under the point', () => {
    const goal = { x0: 30, x1: 330, y0: 118, y1: 122 };
    const label = { x0: 150, x1: 250, y0: 70, y1: 95 };
    const c = placeCallout(200, 100, '76.8', bounds, [label, goal]);
    expect(c.y + CALLOUT.h <= 118 || c.y >= 122).toBe(true);
  });
});
