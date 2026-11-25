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
  height,
  paddingAll,
  size,
  width,
  wrapContentHeight,
  wrapContentWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CaloriesWidgetProps } from '@/lib/widgets';

/**
 * 1×1 single-tile Android home-screen widget for remaining calories today.
 * Engineered to fit cleanly inside a single icon cell (57dp total height:
 * 3dp padding + 46dp ring + 2dp gap + 3dp bar + 3dp padding). Both the ring
 * and slim bottom bar show remaining share in calories orange (or full danger
 * red when over target).
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
  const track = isDark ? '#222825' : '#ECEFED';
  const orange = isDark ? '#FF8A4C' : '#F26A1B';
  const danger = isDark ? '#FF6B6B' : '#C62828';
  const over = Boolean(safeProps.over);
  const accent = over ? danger : orange;
  const progress = Math.min(1, Math.max(0, safeProps.progress ?? 0));
  const valueLabel = safeProps.valueLabel ?? '–';
  const label = safeProps.label ?? 'LEFT';

  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement="center"
      modifiers={[fillMaxSize(), background(surface), cornerRadius(18), paddingAll(3)]}>
      <Box contentAlignment="center" modifiers={[size(46, 46)]}>
        <CircularProgressIndicator
          progress={progress}
          color={accent}
          trackColor={track}
          modifiers={[size(46, 46)]}
        />
        <Column
          horizontalAlignment="center"
          verticalArrangement="center"
          modifiers={[wrapContentWidth(), wrapContentHeight()]}>
          <Text
            color={over ? danger : ink}
            maxLines={1}
            style={{ fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
            {valueLabel}
          </Text>
          <Text
            color={over ? danger : muted}
            maxLines={1}
            style={{ fontSize: 7, fontWeight: 'bold', textAlign: 'center' }}>
            {label}
          </Text>
        </Column>
      </Box>
      <Spacer modifiers={[height(2)]} />
      <LinearProgressIndicator
        progress={progress}
        color={accent}
        trackColor={track}
        modifiers={[width(38), height(3), cornerRadius(2)]}
      />
    </Column>
  );
};

export default createWidget<CaloriesWidgetProps>('CaloriesWidget', CaloriesWidgetLayout, {
  valueLabel: '–',
  label: 'CAL',
  progress: 0,
  over: false,
  updatedDay: '',
});
