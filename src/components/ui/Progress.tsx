import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
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

function Ring({
  size,
  r,
  stroke,
  color,
  track,
  progress,
}: {
  size: number;
  r: number;
  stroke: number;
  color: string;
  track: string;
  progress: number;
}) {
  const c = 2 * Math.PI * r;
  const p = useFill(progress);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - p.value),
    strokeOpacity: p.value > 0.001 ? 1 : 0,
  }));
  return (
    <>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${c} ${c}`}
        strokeLinecap="round"
        fill="none"
        animatedProps={animatedProps}
      />
    </>
  );
}

/**
 * Concentric rings: outer = steps, inner = calories.
 * 132 box, radii 58 and 40, stroke 12, starting at 12 o'clock, clockwise.
 */
export function DualRings({ steps, calories }: { steps: number; calories: number }) {
  const { colors } = useTheme();
  const size = 132;
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={styles.rotate}>
        <Ring size={size} r={58} stroke={12} color={colors.steps} track={colors.track} progress={steps} />
        <Ring size={size} r={40} stroke={12} color={colors.calories} track={colors.track} progress={calories} />
      </Svg>
    </View>
  );
}

/** Height 6, radius 3, track behind, text-coloured fill. */
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
  rotate: { transform: [{ rotate: '-90deg' }] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
