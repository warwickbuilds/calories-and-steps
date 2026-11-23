import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export interface ChartPoint {
  /** x position: milliseconds since epoch */
  t: number;
  value: number;
  /** Optional smoothed value drawn as the main line. */
  trend?: number;
}

/**
 * Minimal line chart in the Rings style: readings as small muted dots, the
 * trend (or the readings when there's no trend) as a text-coloured line, and
 * an optional dashed goal line. Neutral colours only; the steps and calories
 * accents are reserved.
 */
export function LineChart({
  points,
  goal,
  height = 180,
  formatValue,
  formatDate,
  accessibilityLabel,
}: {
  points: ChartPoint[];
  goal?: number | null;
  height?: number;
  formatValue: (v: number) => string;
  formatDate: (t: number) => string;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const pad = { top: 8, bottom: 8, left: 4, right: 4 };

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="label" muted>
          No entries in this range yet.
        </Text>
      </View>
    );
  }

  const values = points.flatMap((p) => (p.trend != null ? [p.value, p.trend] : [p.value]));
  if (goal != null) values.push(goal);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1) {
    const mid = (max + min) / 2;
    min = mid - 0.5;
    max = mid + 0.5;
  }
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const x = (t: number) => pad.left + (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * w);
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min)) * h;

  const linePoints = points.map((p) => [x(p.t), y(p.trend ?? p.value)] as const);
  const d = linePoints.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const showDots = points.some((p) => p.trend != null) || points.length <= 60;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.yLabels}>
        <Text variant="caption" muted>
          {formatValue(max)}
        </Text>
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={pad.left} x2={width - pad.right} y1={y(max)} y2={y(max)} stroke={colors.line} strokeWidth={1} />
            <Line x1={pad.left} x2={width - pad.right} y1={y(min)} y2={y(min)} stroke={colors.line} strokeWidth={1} />
            {goal != null ? (
              <Line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(goal)}
                y2={y(goal)}
                stroke={colors.muted}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ) : null}
            {showDots
              ? points.map((p) => (
                  <Circle key={p.t} cx={x(p.t)} cy={y(p.value)} r={points.length > 60 ? 1.5 : 2.5} fill={colors.muted} />
                ))
              : null}
            {points.length > 1 ? (
              <Path d={d} stroke={colors.text} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={styles.xLabels}>
        <Text variant="caption" muted>
          {formatValue(min)}
        </Text>
      </View>
      <View style={styles.xLabels}>
        <Text variant="caption" muted>
          {formatDate(t0)}
        </Text>
        {goal != null ? (
          <Text variant="caption" muted>
            - - goal {formatValue(goal)}
          </Text>
        ) : null}
        <Text variant="caption" muted>
          {formatDate(t1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  yLabels: { marginBottom: space[1] },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
});
