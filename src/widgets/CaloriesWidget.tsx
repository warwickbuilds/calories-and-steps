import { Box, Column, Image, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  paddingAll,
  wrapContentHeight,
  wrapContentWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CaloriesWidgetProps } from '@/lib/widgets';

/**
 * Calories Left home-screen widget: an orange ring showing the share of
 * today's calories still left, with the number inside, centred in whatever
 * cell the launcher gives (1×1 up, resizable). Over target, the ring is full
 * and red and the label says OVER.
 *
 * The ring is a picture (res/drawable/widget_ring_<calories|over>_<theme>_<step>,
 * made by plugins/withWidgetRings.js) scaled to fit, because Android widgets
 * can't draw a sized progress ring themselves.
 * NOTE: Inside a `'widget'` directive, every constant must live inside the
 * function body (module-scope values are not serialized into the widget bundle).
 */
const CaloriesWidgetLayout = (props: CaloriesWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const safeProps = props ?? {};
  const isDark = environment?.colorScheme === 'dark';
  const surface = isDark ? '#151917' : '#FFFFFF';
  const ink = isDark ? '#F2F4F3' : '#0E1111';
  const muted = isDark ? '#9AA39F' : '#5B6360';
  const danger = isDark ? '#FF6B6B' : '#C62828';
  const over = Boolean(safeProps.over);
  const progress = Math.min(1, Math.max(0, Number(safeProps.progress) || 0));
  // Older snapshots have no ringStep; work it out the same way as ringStep().
  const fallbackStep =
    progress <= 0 ? 0 : progress >= 1 ? 100 : Math.min(95, Math.max(5, Math.round(progress * 20) * 5));
  const rawStep = Number(safeProps.ringStep);
  const step = Number.isFinite(rawStep) ? Math.min(100, Math.max(0, Math.round(rawStep / 5) * 5)) : fallbackStep;
  const theme = isDark ? 'dark' : 'light';
  const ring = over ? `widget_ring_over_${theme}_100` : `widget_ring_calories_${theme}_${step}`;
  const valueLabel = safeProps.valueLabel ?? '–';
  const label = safeProps.label ?? 'LEFT';

  return (
    <Box
      contentAlignment="center"
      modifiers={[fillMaxSize(), background(surface), cornerRadius(20), paddingAll(6)]}>
      <Image source={{ uri: ring }} contentScale="fit" modifiers={[fillMaxSize()]} />
      <Column
        horizontalAlignment="center"
        verticalArrangement="center"
        modifiers={[wrapContentWidth(), wrapContentHeight()]}>
        <Text
          color={over ? danger : ink}
          maxLines={1}
          style={{ fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
          {valueLabel}
        </Text>
        <Text
          color={over ? danger : muted}
          maxLines={1}
          style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>
          {label}
        </Text>
      </Column>
    </Box>
  );
};

export default createWidget<CaloriesWidgetProps>('CaloriesWidget', CaloriesWidgetLayout, {
  valueLabel: '–',
  label: 'CAL',
  progress: 0,
  ringStep: 0,
  over: false,
  updatedDay: '',
});
