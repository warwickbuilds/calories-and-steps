import { useId, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui';
import { CALLOUT, placeCallout, type Box, type Callout } from '@/lib/chartCallout';
import { nearestPointIndex } from '@/lib/chartScrub';
import { hapticTick } from '@/lib/haptics';
import { softTint } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

export interface ChartPoint {
  /** x position: milliseconds since epoch */
  t: number;
  value: number;
  /** Optional smoothed value, drawn as a faint dashed line under the readings. */
  trend?: number;
}

export interface ChartMarker {
  t: number;
  value: number;
  color: string;
  /** Short text drawn above the marker, e.g. "−10". */
  label: string;
}

/** A faint horizontal line in a colour, e.g. the next milestone. */
export interface ChartGuide {
  value: number;
  color: string;
}

export interface ChartProjection {
  from: { t: number; value: number };
  to: { t: number; value: number };
  /** True when the line stops before the goal (the chart would be too long). */
  cut: boolean;
}

/** Round gridline values inside [min, max], at most about four of them. */
export function niceTicks(min: number, max: number): number[] {
  const span = max - min;
  if (!(span > 0)) return [];
  const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  const step = steps.find((s) => span / s <= 4) ?? 100;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

/**
 * Minimal line chart in the Rings style. The readings are the main line
 * (accent-coloured with a soft gradient area wash underneath); an optional
 * trend is a faint dashed line that can carry on as a projection to the goal.
 * Touch or drag across the chart to scrub and inspect any reading with a
 * crosshair and floating readout pill. Steps green and calories orange are
 * never used here.
 */
export function LineChart({
  points,
  goal,
  projection,
  markers = [],
  guides = [],
  endLabels,
  accentColor,
  height = 180,
  formatValue,
  formatDate,
  formatInspectValue,
  formatInspectDate,
  accessibilityLabel,
}: {
  points: ChartPoint[];
  goal?: number | null;
  projection?: ChartProjection | null;
  markers?: ChartMarker[];
  guides?: ChartGuide[];
  /** Shows the first and latest reading in small value bubbles, formatted by this. */
  endLabels?: (v: number) => string;
  /** Semantic highlight hue for the readings line and soft area wash (never green or orange). */
  accentColor?: string;
  height?: number;
  formatValue: (v: number) => string;
  formatDate: (t: number) => string;
  /** Optional richer value formatter for the interactive scrub readout (e.g. "77.2 kg"). */
  formatInspectValue?: (v: number) => string;
  /** Optional date formatter for the interactive scrub readout. */
  formatInspectDate?: (t: number) => string;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<{ series: ChartPoint[]; index: number } | null>(null);
  const activeIndex = selection?.series === points ? selection.index : null;
  const setActiveIndex = (index: number | null) =>
    setSelection(index == null ? null : { series: points, index });
  const gradId = `area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    moved: false,
    scrubbing: false,
    prevPinned: null as number | null,
    lastIndex: null as number | null,
  });

  const strokeColor = accentColor ?? colors.text;
  // The left gutter holds the gridline values so they never sit on the line.
  // Top padding leaves room for value bubbles and the floating scrub pill without layout shift.
  const pad = { top: 34, bottom: endLabels ? 12 : 8, left: 30, right: 10 };

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="label" muted>
          No entries in this range yet.
        </Text>
      </View>
    );
  }

  const hasTrend = points.some((p) => p.trend != null);
  const values = points.flatMap((p) => (p.trend != null ? [p.value, p.trend] : [p.value]));
  if (goal != null) values.push(goal);
  if (projection) values.push(projection.from.value, projection.to.value);
  for (const m of markers) values.push(m.value);
  for (const g of guides) values.push(g.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1) {
    const mid = (max + min) / 2;
    min = mid - 0.5;
    max = mid + 0.5;
  }
  // A little headroom so lines don't sit on the edge.
  const extra = (max - min) * 0.04;
  min -= extra;
  max += extra;

  const t0 = points[0].t;
  const lastT = points[points.length - 1].t;
  const t1 = Math.max(lastT, projection?.to.t ?? lastT);
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const x = (t: number) => pad.left + (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * w);
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min)) * h;
  const path = (pts: (readonly [number, number])[]) =>
    pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');

  const readingCoords = points.map((p) => [x(p.t), y(p.value)] as const);
  const xs = readingCoords.map(([px]) => px);
  const readings = path(readingCoords);
  const bottomY = pad.top + h;
  const areaPath =
    points.length > 1
      ? `${readings} L${readingCoords[readingCoords.length - 1][0].toFixed(1)},${bottomY.toFixed(1)} L${readingCoords[0][0].toFixed(1)},${bottomY.toFixed(1)} Z`
      : null;
  const trend = hasTrend
    ? path(points.filter((p) => p.trend != null).map((p) => [x(p.t), y(p.trend!)] as const))
    : null;
  const ticks = niceTicks(min, max);
  const dotR = points.length > 120 ? 0 : points.length > 40 ? 1.6 : 2.6;
  const last = points[points.length - 1];
  const first = points[0];
  const activePoint = activeIndex != null && activeIndex < points.length ? points[activeIndex] : null;

  const selectAt = (locX: number) => {
    const idx = nearestPointIndex(xs, locX);
    if (idx != null && idx !== touchRef.current.lastIndex) {
      touchRef.current.lastIndex = idx;
      hapticTick();
      setActiveIndex(idx);
    }
    return idx;
  };

  // Value bubbles for the first and latest reading. Hidden while scrubbing so the crosshair readout stays clear.
  const callouts: Callout[] = [];
  if (endLabels && width > 0 && !activePoint) {
    const bounds = { left: pad.left, right: width - pad.right, top: 0, bottom: height };
    const avoid: Box[] = markers.map((m) => {
      const mx = Math.min(Math.max(x(m.t), pad.left + 12), width - pad.right - 12);
      return { x0: mx - 14, x1: mx + 14, y0: y(m.value) - 21, y1: y(m.value) + 6 };
    });
    // Keep clear of the goal line so its dots stay readable.
    if (goal != null) avoid.push({ x0: pad.left, x1: width - pad.right, y0: y(goal) - 2, y1: y(goal) + 2 });
    const ends = points.length > 1 ? [first, last] : [last];
    for (const p of ends) {
      const c = placeCallout(x(p.t), y(p.value), endLabels(p.value), bounds, avoid);
      callouts.push(c);
      avoid.push({ x0: c.x - 2, x1: c.x + c.w + 2, y0: c.y - 2, y1: c.y + CALLOUT.h + 2 });
    }
  }

  const faint = { stroke: colors.muted, strokeOpacity: 0.75, strokeWidth: 1.5, strokeDasharray: '5 4', fill: 'none' };
  const inspectVal = formatInspectValue ?? formatValue;
  const inspectDate = formatInspectDate ?? formatDate;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => width > 0 && points.length > 0}
        onMoveShouldSetResponder={(_, ) => false}
        onResponderTerminationRequest={() => !touchRef.current.scrubbing}
        onResponderGrant={(e) => {
          const { locationX, pageY } = e.nativeEvent;
          touchRef.current = {
            startX: locationX,
            startY: pageY,
            moved: false,
            scrubbing: false,
            prevPinned: activeIndex,
            lastIndex: activeIndex,
          };
          selectAt(locationX);
        }}
        onResponderMove={(e) => {
          const { locationX, pageY } = e.nativeEvent;
          const dx = Math.abs(locationX - touchRef.current.startX);
          const dy = Math.abs(pageY - touchRef.current.startY);
          if (!touchRef.current.scrubbing && dx > 6 && dx >= dy) {
            touchRef.current.scrubbing = true;
            touchRef.current.moved = true;
          }
          if (touchRef.current.scrubbing || dx > 4) {
            touchRef.current.moved = true;
            selectAt(locationX);
          }
        }}
        onResponderRelease={() => {
          const { moved, prevPinned, lastIndex } = touchRef.current;
          touchRef.current.scrubbing = false;
          if (moved) {
            // Dragging clears smoothly on lift.
            setActiveIndex(null);
            touchRef.current.lastIndex = null;
          } else if (prevPinned != null && prevPinned === lastIndex) {
            // Tapping the already-pinned point dismisses it.
            setActiveIndex(null);
            touchRef.current.lastIndex = null;
          }
        }}
        onResponderTerminate={() => {
          touchRef.current.scrubbing = false;
          setActiveIndex(null);
          touchRef.current.lastIndex = null;
        }}>
        {activePoint ? (
          <View style={styles.scrubRow} pointerEvents="none">
            <View
              style={[
                styles.scrubPill,
                {
                  backgroundColor: softTint(strokeColor, '1C'),
                  borderColor: softTint(strokeColor, '4D'),
                },
              ]}>
              <View style={[styles.scrubDot, { backgroundColor: strokeColor }]} />
              <Text variant="caption" style={styles.scrubValue}>
                {inspectVal(activePoint.value)}
              </Text>
              <Text variant="caption" muted>
                {inspectDate(activePoint.t)}
              </Text>
              {activePoint.trend != null ? (
                <Text variant="caption" muted style={styles.tabular}>
                  · trend {formatValue(activePoint.trend)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        {width > 0 ? (
          <Svg width={width} height={height}>
            {areaPath ? (
              <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.18} />
                  <Stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </LinearGradient>
              </Defs>
            ) : null}
            {ticks.map((v) => (
              <Line key={`g${v}`} x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} />
            ))}
            {ticks.map((v) => (
              <SvgText key={`l${v}`} x={pad.left - 6} y={y(v) + 3.5} fontSize={10} fill={colors.muted} textAnchor="end">
                {formatValue(v)}
              </SvgText>
            ))}
            {areaPath ? <Path d={areaPath} fill={`url(#${gradId})`} /> : null}
            {guides.map((g) => (
              <Line
                key={`gd${g.value}`}
                x1={pad.left}
                x2={width - pad.right}
                y1={y(g.value)}
                y2={y(g.value)}
                stroke={g.color}
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ))}
            {goal != null ? (
              <Line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(goal)}
                y2={y(goal)}
                stroke={colors.text}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray="0.1 5"
                strokeLinecap="round"
              />
            ) : null}
            {goal != null && !ticks.some((v) => Math.abs(y(v) - y(goal)) < 12) ? (
              <SvgText x={pad.left - 6} y={y(goal) + 3.5} fontSize={10} fontWeight="600" fill={colors.text} textAnchor="end">
                {formatValue(goal)}
              </SvgText>
            ) : null}
            {trend ? <Path d={trend} {...faint} strokeLinejoin="round" /> : null}
            {projection ? (
              <>
                <Path
                  d={path([
                    [x(projection.from.t), y(projection.from.value)],
                    [x(projection.to.t), y(projection.to.value)],
                  ])}
                  {...faint}
                />
                {!projection.cut ? (
                  <Circle
                    cx={x(projection.to.t)}
                    cy={y(projection.to.value)}
                    r={4}
                    fill={colors.surface}
                    stroke={strokeColor}
                    strokeWidth={1.75}
                  />
                ) : null}
              </>
            ) : null}
            {points.length > 1 ? (
              <Path
                d={readings}
                stroke={strokeColor}
                strokeWidth={points.length > 120 ? 1.5 : 2.2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {dotR > 0
              ? points.map((p) => <Circle key={p.t} cx={x(p.t)} cy={y(p.value)} r={dotR} fill={strokeColor} />)
              : null}
            {endLabels && points.length > 1 && !activePoint ? (
              <Circle cx={x(first.t)} cy={y(first.value)} r={4} fill={strokeColor} stroke={colors.surface} strokeWidth={1.5} />
            ) : null}
            {!activePoint ? (
              <Circle cx={x(last.t)} cy={y(last.value)} r={4.5} fill={strokeColor} stroke={colors.surface} strokeWidth={2} />
            ) : null}
            {markers.map((m) => (
              <Circle
                key={`m${m.label}`}
                cx={x(m.t)}
                cy={y(m.value)}
                r={5}
                fill={m.color}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
            {markers.map((m) => (
              <SvgText
                key={`ml${m.label}`}
                x={Math.min(Math.max(x(m.t), pad.left + 12), width - pad.right - 12)}
                y={y(m.value) - 9}
                fontSize={11}
                fontWeight="600"
                fill={m.color}
                textAnchor="middle">
                {m.label}
              </SvgText>
            ))}
            {activePoint ? (
              <>
                <Line
                  x1={x(activePoint.t)}
                  x2={x(activePoint.t)}
                  y1={pad.top}
                  y2={bottomY}
                  stroke={strokeColor}
                  strokeOpacity={0.45}
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                />
                <Circle cx={x(activePoint.t)} cy={y(activePoint.value)} r={8.5} fill={strokeColor} fillOpacity={0.18} />
                <Circle
                  cx={x(activePoint.t)}
                  cy={y(activePoint.value)}
                  r={4.8}
                  fill={strokeColor}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
              </>
            ) : null}
            {callouts.map((c, i) => (
              <CalloutBubble key={`c${i}`} c={c} fill={colors.text} ink={colors.surface} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={[styles.xLabels, { paddingLeft: pad.left }]}>
        <Text variant="caption" muted>
          {formatDate(t0)}
        </Text>
        <Text variant="caption" muted>
          {formatDate(t1)}
        </Text>
      </View>
      {hasTrend || goal != null ? (
        <View style={styles.legend}>
          <LegendItem label="Weigh-ins" color={strokeColor} />
          {hasTrend ? <LegendItem label={projection ? 'Trend and projection' : 'Trend'} color={colors.muted} dash="5 4" /> : null}
          {goal != null ? <LegendItem label={`Goal ${formatValue(goal)}`} color={colors.text} dash="0.1 5" dotted /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** A small filled bubble with a pointer, in the text colour so it reads in light and dark. */
function CalloutBubble({ c, fill, ink }: { c: Callout; fill: string; ink: string }) {
  const { h, pointer } = CALLOUT;
  const base = c.below ? c.y : c.y + h;
  const tip = c.below ? base - pointer : base + pointer;
  return (
    <>
      <Rect x={c.x} y={c.y} width={c.w} height={h} rx={h / 2} fill={fill} />
      <Path
        d={`M${(c.tipX - pointer).toFixed(1)},${base.toFixed(1)} L${c.tipX.toFixed(1)},${tip.toFixed(1)} L${(c.tipX + pointer).toFixed(1)},${base.toFixed(1)} Z`}
        fill={fill}
      />
      <SvgText x={c.x + c.w / 2} y={c.y + h / 2 + 3.8} fontSize={11} fontFamily={fonts.semibold} fill={ink} textAnchor="middle">
        {c.text}
      </SvgText>
    </>
  );
}

function LegendItem({ label, color, dash, dotted }: { label: string; color: string; dash?: string; dotted?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <Svg width={18} height={8}>
        <Line
          x1={2}
          x2={16}
          y1={4}
          y2={4}
          stroke={color}
          strokeOpacity={dash ? (dotted ? 0.55 : 0.75) : 1}
          strokeWidth={dotted ? 2 : 1.75}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </Svg>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  scrubRow: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  scrubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  scrubDot: { width: 6, height: 6, borderRadius: 3 },
  scrubValue: { fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] },
  tabular: { fontVariant: ['tabular-nums'] },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[3], rowGap: space[1], marginTop: space[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});
