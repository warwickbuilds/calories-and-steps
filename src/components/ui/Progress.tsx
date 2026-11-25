import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Animates 0 → value over 600 ms ease-out, or jumps when Reduce Motion is on. */
function useFill(progress: number) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    const target = clamp01(progress);
    p.value = reduced ? target : withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, reduced, p]);
  return p;
}

/**
 * Countdown gauge: a 270 degree arc open at the bottom. `progress` is the
 * share still left, so it starts full and empties as you eat. `children`
 * sit in the middle.
 */
export function ArcGauge({
  progress,
  color,
  size = 176,
  stroke = 14,
  children,
}: {
  progress: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const halo = stroke + 6;
  const r = (size - halo) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const p = useFill(progress);
  const haloBoost = useSharedValue(0.16);
  useEffect(() => {
    if (reduced) {
      haloBoost.value = 0.16;
      return;
    }
    haloBoost.value = withSequence(
      withTiming(0.26, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withTiming(0.16, { duration: 480, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [progress, reduced, haloBoost]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arc * (1 - p.value),
    strokeOpacity: p.value > 0.001 ? 1 : 0,
  }));
  const haloProps = useAnimatedProps(() => ({
    strokeDashoffset: arc * (1 - p.value),
    strokeOpacity: p.value > 0.001 ? haloBoost.value : 0,
  }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.gauge}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.track}
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={halo}
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
          fill="none"
          animatedProps={haloProps}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.gaugeCenter} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

/** Stacked bar, height 8, one rounded segment per share (shares add up to 1 or are all 0). */
export function SplitBar({ parts }: { parts: { share: number; color: string }[] }) {
  const { colors } = useTheme();
  const shown = parts.filter((x) => x.share > 0);
  return (
    <View style={[styles.split, { backgroundColor: shown.length ? 'transparent' : colors.track }]}>
      {shown.map((x, i) => (
        <View key={i} style={{ flex: x.share, backgroundColor: x.color, borderRadius: 4 }} />
      ))}
    </View>
  );
}

/** Height 8, radius 4, track behind, coloured fill. */
export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const { colors } = useTheme();
  const p = useFill(progress);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: colors.track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color ?? colors.text }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Circle strokes start at 3 o'clock; turning 135 degrees puts the gap at the bottom.
  gauge: { transform: [{ rotate: '135deg' }] },
  gaugeCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  split: { height: 8, borderRadius: 4, flexDirection: 'row', gap: 2, overflow: 'hidden' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
