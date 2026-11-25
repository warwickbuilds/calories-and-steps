import {
  Box,
  CircularProgressIndicator,
  Column,
  LinearProgressIndicator,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CaloriesWidgetProps } from '@/lib/widgets';

/**
 * Single-tile Android home-screen widget for remaining calories today.
 * Circular ring shows share remaining (or full danger ring when over);
 * bottom bar shows eaten share against the daily target.
 * NOTE: Inside a `'widget'` directive, every constant must live inside the
 * function body (module-scope values are not serialized into the widget bundle).
 */
const CaloriesWidgetLayout = (props: CaloriesWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const isDark = environment.colorScheme === 'dark';
  const surface = isDark ? '#151917' : '#FFFFFF';
  const ink = isDark ? '#F2F4F3' : '#0E1111';
  const muted = isDark ? '#9AA39F' : '#5B6360';
  const track = isDark ? '#222825' : '#ECEFED';
  // Calories orange (or danger red when over; matches src/theme/colors.ts)
  const orange = isDark ? '#FF8A4C' : '#F26A1B';
  const danger = isDark ? '#FF6B6B' : '#C62828';
  const accent = props.over ? danger : orange;
  const ringProgress = Math.min(1, Math.max(0, props.remainingProgress ?? 0));
  const barProgress = Math.min(1, Math.max(0, props.eatenProgress ?? 0));

  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement="center"
      modifiers={[fillMaxSize(), background(surface), cornerRadius(24), paddingAll(12)]}>
      <Text color={muted} maxLines={1} style={{ fontSize: 10, fontWeight: 'bold' }}>
        CALORIES
      </Text>
      <Spacer modifiers={[height(6)]} />
      <Box contentAlignment="center" modifiers={[size(68, 68)]}>
        <CircularProgressIndicator
          progress={ringProgress}
          color={accent}
          trackColor={track}
          modifiers={[size(68, 68)]}
        />
        <Column horizontalAlignment="center" verticalArrangement="center">
          <Text
            color={props.over ? danger : ink}
            maxLines={1}
            style={{ fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
            {props.valueLabel}
          </Text>
          <Text
            color={props.over ? danger : muted}
            maxLines={1}
            style={{ fontSize: 9, textAlign: 'center' }}>
            {props.statusLabel}
          </Text>
        </Column>
      </Box>
      <Spacer modifiers={[height(8)]} />
      <LinearProgressIndicator
        progress={barProgress}
        color={accent}
        trackColor={track}
        modifiers={[fillMaxWidth(), height(5), cornerRadius(3)]}
      />
      <Spacer modifiers={[height(4)]} />
      <Text
        color={props.over ? danger : muted}
        maxLines={1}
        style={{ fontSize: 10, textAlign: 'center' }}>
        {props.subLabel}
      </Text>
    </Column>
  );
};

export default createWidget<CaloriesWidgetProps>('CaloriesWidget', CaloriesWidgetLayout, {
  valueLabel: '–',
  statusLabel: 'left',
  subLabel: 'Open app',
  remainingProgress: 1,
  eatenProgress: 0,
  over: false,
  updatedDay: '',
});
