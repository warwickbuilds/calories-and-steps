import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const GUTTER = 34;

/**
 * Step bars in steps green. With a target, it is drawn as a dotted line and
 * bars that reach it are full strength while the rest are faded. Without one
 * (today's hours) every bar is full strength. Missing values leave a gap.
 */
export function StepsChart({
  bars,
  target = null,
  labels,
  height = 160,
  accessibilityLabel,
}: {
  bars: { key: string; value: number | null }[];
  target?: number | null;
  /** Labels under the chart: one per bar, or a few spread from left to right. */
  labels: string[];
  height?: number;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const pad = { top: 16, bottom: 4, left: target ? GUTTER : 4, right: 4 };
  const max = Math.max(target ? target * 1.15 : 1, ...bars.map((b) => b.value ?? 0));
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const slot = bars.length ? plotW / bars.length : 0;
  const barW = Math.max(2, Math.min(28, slot * 0.62));
  const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={colors.line} strokeWidth={1} />
            {bars.map((b, i) => {
              if (b.value == null || b.value <= 0) return null;
              const x = pad.left + i * slot + (slot - barW) / 2;
              const top = y(b.value);
              return (
                <Rect
                  key={b.key}
                  x={x}
                  y={top}
                  width={barW}
                  height={Math.max(1, y(0) - top)}
                  rx={Math.min(4, barW / 2)}
                  fill={colors.steps}
                  opacity={target && b.value < target ? 0.4 : 1}
                />
              );
            })}
            {target ? (
              <>
                <Line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y(target)}
                  y2={y(target)}
                  stroke={colors.text}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.6}
                />
                <SvgText x={pad.left - 6} y={y(target) + 4} fontSize={11} fontFamily={fonts.regular} fill={colors.muted} textAnchor="end">
                  {short(target)}
                </SvgText>
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View style={[styles.axis, { paddingLeft: pad.left, paddingRight: pad.right }]}>
        {labels.map((l, i) => (
          <Text
            key={`${l}-${i}`}
            variant="caption"
            muted
            // One label per bar sits under its bar; fewer labels spread out.
            style={labels.length === bars.length ? styles.under : undefined}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
  under: { flex: 1, textAlign: 'center' },
});
