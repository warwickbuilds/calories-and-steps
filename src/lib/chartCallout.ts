/** Value bubbles on charts: size and placement, kept apart from the drawing so it can be tested. */

/** A box in chart pixels, used to keep labels from landing on each other. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Callout size: 11px Inter semibold digits are about 7px wide. */
export const CALLOUT = { h: 18, padX: 6, pointer: 4, gap: 5, charW: 7 };

export interface Callout {
  /** Left edge of the bubble. */
  x: number;
  /** Top edge of the bubble. */
  y: number;
  w: number;
  /** Where the pointer touches: the point itself, nudged by the gap. */
  tipX: number;
  tipY: number;
  below: boolean;
  text: string;
}

/**
 * Places a small value bubble with a pointer next to a point. It tries above
 * the point first (centred, then leaning left, then leaning right), then the
 * same three below it, and takes the first spot that stays inside the chart
 * and clear of everything in `avoid` (milestone labels, the goal line, the
 * other bubble). If nothing is clear it sits centred above the point.
 */
export function placeCallout(
  px: number,
  py: number,
  text: string,
  bounds: { left: number; right: number; top: number; bottom: number },
  avoid: Box[],
): Callout {
  const { h, pointer, gap, charW, padX } = CALLOUT;
  const w = Math.round(text.length * charW + padX * 2);
  const clampX = (x: number) => Math.min(Math.max(x, bounds.left), bounds.right - w);
  const xs = [px - w / 2, px - w + 8, px - 8].map(clampX);
  const fits = (b: Box) =>
    b.x0 >= bounds.left - 0.5 &&
    b.x1 <= bounds.right + 0.5 &&
    b.y0 >= bounds.top &&
    b.y1 <= bounds.bottom &&
    !avoid.some((a) => overlaps(a, b));
  const candidates = [false, true].flatMap((below) =>
    xs.map((x) => {
      const y0 = below ? py + gap + pointer : py - gap - pointer - h;
      return { below, box: { x0: x, x1: x + w, y0, y1: y0 + h } };
    }),
  );
  const pick = candidates.find((c) => fits(c.box)) ?? candidates[0];
  const { x0: x, y0: y } = pick.box;
  return {
    x,
    y,
    w,
    tipX: Math.min(Math.max(px, x + 6), x + w - 6),
    tipY: pick.below ? py + gap : py - gap,
    below: pick.below,
    text,
  };
}
