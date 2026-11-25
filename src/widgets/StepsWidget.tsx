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

import type { StepsWidgetProps } from '@/lib/widgets';

/**
 * Single-tile Android home-screen widget for today's steps.
 * NOTE: Inside a `'widget'` directive, every constant must live inside the
 * function body (module-scope values are not serialized into the widget bundle).
 */
const StepsWidgetLayout = (props: StepsWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const isDark = environment.colorScheme === 'dark';
  const surface = isDark ? '#151917' : '#FFFFFF';
  const ink = isDark ? '#F2F4F3' : '#0E1111';
  const muted = isDark ? '#9AA39F' : '#5B6360';
  const track = isDark ? '#222825' : '#ECEFED';
  // Steps green only (matches src/theme/colors.ts)
  const accent = isDark ? '#B6F24A' : '#1F9D55';
  const progress = Math.min(1, Math.max(0, props.progress ?? 0));

  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement="center"
      modifiers={[fillMaxSize(), background(surface), cornerRadius(24), paddingAll(12)]}>
      <Text color={muted} maxLines={1} style={{ fontSize: 10, fontWeight: 'bold' }}>
        STEPS
      </Text>
      <Spacer modifiers={[height(6)]} />
      <Box contentAlignment="center" modifiers={[size(68, 68)]}>
        <CircularProgressIndicator
          progress={progress}
          color={accent}
          trackColor={track}
          modifiers={[size(68, 68)]}
        />
        <Column horizontalAlignment="center" verticalArrangement="center">
          <Text
            color={ink}
            maxLines={1}
            style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
            {props.valueLabel}
          </Text>
        </Column>
      </Box>
      <Spacer modifiers={[height(8)]} />
      <LinearProgressIndicator
        progress={progress}
        color={accent}
        trackColor={track}
        modifiers={[fillMaxWidth(), height(5), cornerRadius(3)]}
      />
      <Spacer modifiers={[height(4)]} />
      <Text
        color={props.reached ? accent : muted}
        maxLines={1}
        style={{ fontSize: 10, textAlign: 'center' }}>
        {props.subLabel}
      </Text>
    </Column>
  );
};

export default createWidget<StepsWidgetProps>('StepsWidget', StepsWidgetLayout, {
  valueLabel: '0',
  subLabel: 'of 10k',
  progress: 0,
  reached: false,
  updatedDay: '',
});
