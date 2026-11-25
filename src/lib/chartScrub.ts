/** Pure hit-testing helpers for interactive chart scrubbing and bar inspection. */

/** Returns the index in `xs` closest to `touchX`, or null if `xs` is empty. */
export function nearestPointIndex(xs: readonly number[], touchX: number): number | null {
  if (xs.length === 0 || !Number.isFinite(touchX)) return null;
  let bestIdx = 0;
  let bestDist = Math.abs(xs[0] - touchX);
  for (let i = 1; i < xs.length; i++) {
    const dist = Math.abs(xs[i] - touchX);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Maps a touch X coordinate inside a bar chart's plot region `[left, left + plotWidth]`
 * to a clamped bar index `0 .. count - 1`. Returns null if the chart has no bars or
 * zero width, or if the touch is well outside the plot area.
 */
export function barIndexAtX(
  count: number,
  touchX: number,
  left: number,
  plotWidth: number,
): number | null {
  if (count <= 0 || !(plotWidth > 0) || !Number.isFinite(touchX)) return null;
  const rel = touchX - left;
  if (rel < -12 || rel > plotWidth + 12) return null;
  const slot = plotWidth / count;
  const raw = Math.floor(rel / slot);
  return Math.max(0, Math.min(count - 1, raw));
}
