import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui';
import { barIndexAtX } from '@/lib/chartScrub';
import { hapticTick } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

const GUTTER = 34;

export interface StepsBar {
  key: string;
  value: number | null;
}

/**
 * Step bars in steps green. With a target, it is drawn as a dotted line and
 * bars that reach it are full strength while the rest are faded. Without one
 * (today's hours) every bar is full strength. Tap or drag across bars to
 * inspect an exact day or hour. Missing values leave a gap.
 */
export function StepsChart({
  bars,
  target = null,
  labels,
  height = 160,
  formatInspect,
  accessibilityLabel,
}: {
  bars: StepsBar[];
  target?: number | null;
  /** Labels under the chart: one per bar, or a few spread from left to right. */
  labels: string[];
  height?: number;
  /** Formats the floating inspection pill when a bar is tapped or scrubbed. */
  formatInspect?: (bar: StepsBar, index: number) => { label: string; value: string };
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<{ count: number; index: number } | null>(null);
  const activeIndex = selection?.count === bars.length ? selection.index : null;
  const setActiveIndex = (index: number | null) =>
    setSelection(index == null ? null : { count: bars.length, index });
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    moved: false,
    scrubbing: false,
    prevPinned: null as number | null,
    lastIndex: null as number | null,
  });

  const pad = { top: formatInspect ? 28 : 16, bottom: 4, left: target ? GUTTER : 4, right: 4 };
  const max = Math.max(target ? target * 1.15 : 1, ...bars.map((b) => b.value ?? 0));
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const slot = bars.length ? plotW / bars.length : 0;
  const barW = Math.max(2, Math.min(28, slot * 0.62));
  const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

  const activeBar = activeIndex != null && activeIndex < bars.length ? bars[activeIndex] : null;
  const inspected = activeBar && formatInspect ? formatInspect(activeBar, activeIndex!) : null;

  const selectAt = (locX: number) => {
    const idx = barIndexAtX(bars.length, locX, pad.left, plotW);
    if (idx != null && idx !== touchRef.current.lastIndex) {
      touchRef.current.lastIndex = idx;
      hapticTick();
      setActiveIndex(idx);
    }
    return idx;
  };

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !!formatInspect && width > 0 && bars.length > 0}
        onMoveShouldSetResponder={() => false}
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
            setActiveIndex(null);
            touchRef.current.lastIndex = null;
          } else if (prevPinned != null && prevPinned === lastIndex) {
            setActiveIndex(null);
            touchRef.current.lastIndex = null;
          }
        }}
        onResponderTerminate={() => {
          touchRef.current.scrubbing = false;
          setActiveIndex(null);
          touchRef.current.lastIndex = null;
        }}>
        {inspected ? (
          <View style={styles.inspectRow} pointerEvents="none">
            <View style={[styles.inspectPill, { backgroundColor: colors.stepsSoft }]}>
              <View style={[styles.inspectDot, { backgroundColor: colors.steps }]} />
              <Text variant="caption" style={styles.inspectVal}>
                {inspected.value}
              </Text>
              <Text variant="caption" muted>
                {inspected.label}
              </Text>
            </View>
          </View>
        ) : null}
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke={colors.line} strokeWidth={1} />
            {bars.map((b, i) => {
              const isSelected = activeIndex === i;
              const x = pad.left + i * slot + (slot - barW) / 2;
              if (b.value == null || b.value <= 0) {
                if (!isSelected) return null;
                return (
                  <Line
                    key={b.key}
                    x1={x + barW / 2}
                    x2={x + barW / 2}
                    y1={pad.top}
                    y2={y(0)}
                    stroke={colors.steps}
                    strokeOpacity={0.35}
                    strokeWidth={1.25}
                    strokeDasharray="3 3"
                  />
                );
              }
              const top = y(b.value);
              const baseOpacity = target && b.value < target ? 0.42 : 1;
              const opacity = activeIndex != null ? (isSelected ? 1 : 0.25) : baseOpacity;
              return (
                <Rect
                  key={b.key}
                  x={x}
                  y={top}
                  width={barW}
                  height={Math.max(1, y(0) - top)}
                  rx={Math.min(4, barW / 2)}
                  fill={colors.steps}
                  opacity={opacity}
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
        {labels.map((l, i) => {
          const isHighlighted = activeIndex != null && labels.length === bars.length ? activeIndex === i : l === 'Today';
          return (
            <Text
              key={`${l}-${i}`}
              variant="caption"
              muted={!isHighlighted}
              // One label per bar sits under its bar; fewer labels spread out.
              style={[labels.length === bars.length && styles.under, isHighlighted && styles.todayLabel]}>
              {l}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inspectRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  inspectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  inspectDot: { width: 6, height: 6, borderRadius: 3 },
  inspectVal: { fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
  under: { flex: 1, textAlign: 'center' },
  todayLabel: { fontFamily: fonts.semibold },
});
