import { Box, Button, Column, Image, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  paddingAll,
  wrapContentHeight,
  wrapContentWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { StepsWidgetProps } from '@/lib/widgets';

/**
 * Daily Steps home-screen widget: a green progress ring with today's steps
 * inside it, centred in whatever cell the launcher gives (1×1 up, resizable).
 *
 * The ring is a picture (res/drawable/widget_ring_steps_<theme>_<step>, made by
 * plugins/withWidgetRings.js) scaled to fit, because Android widgets can't draw
 * a sized progress ring themselves.
 * The widget has no background (transparent); the ring picture carries a
 * see-through disc behind the number so it reads on any wallpaper.
 * Tapping anywhere on the widget opens the app on the Steps tab. The whole
 * layout sits in a Button whose target is "openUrl:<deep link>"; our patch to
 * expo-widgets (patches/expo-widgets+*.patch) turns that into an "open this
 * link" action instead of the usual broadcast.
 * NOTE: Inside a `'widget'` directive, every constant must live inside the
 * function body (module-scope values are not serialized into the widget bundle).
 */
const StepsWidgetLayout = (props: StepsWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const safeProps = props ?? {};
  const isDark = environment?.colorScheme === 'dark';
  const ink = isDark ? '#F2F4F3' : '#0E1111';
  const muted = isDark ? '#9AA39F' : '#5B6360';
  const accent = isDark ? '#B6F24A' : '#1F9D55';
  const progress = Math.min(1, Math.max(0, Number(safeProps.progress) || 0));
  // Older snapshots have no ringStep; work it out the same way as ringStep().
  const fallbackStep =
    progress <= 0 ? 0 : progress >= 1 ? 100 : Math.min(95, Math.max(5, Math.round(progress * 20) * 5));
  const rawStep = Number(safeProps.ringStep);
  const step = Number.isFinite(rawStep) ? Math.min(100, Math.max(0, Math.round(rawStep / 5) * 5)) : fallbackStep;
  const ring = `widget_ring_steps_${isDark ? 'dark' : 'light'}_${step}`;
  const valueLabel = safeProps.valueLabel ?? '–';
  const label = safeProps.label ?? 'STEPS';
  const reached = Boolean(safeProps.reached);

  // `target` isn't in Button's types; expo-widgets reads it from the props.
  const tap = { target: 'openUrl:caloriesandsteps://steps' } as Record<string, string>;

  return (
    <Button {...tap} modifiers={[fillMaxSize()]}>
      <Box
        contentAlignment="center"
        modifiers={[fillMaxSize(), paddingAll(4)]}>
        <Image source={{ uri: ring }} contentScale="fit" modifiers={[fillMaxSize()]} />
        <Column
          horizontalAlignment="center"
          verticalArrangement="center"
          modifiers={[wrapContentWidth(), wrapContentHeight()]}>
          <Text
            color={ink}
            maxLines={1}
            style={{ fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
            {valueLabel}
          </Text>
          <Text
            color={reached ? accent : muted}
            maxLines={1}
            style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>
            {label}
          </Text>
        </Column>
      </Box>
    </Button>
  );
};

export default createWidget<StepsWidgetProps>('StepsWidget', StepsWidgetLayout, {
  valueLabel: '–',
  label: 'STEPS',
  progress: 0,
  ringStep: 0,
  reached: false,
  updatedDay: '',
});
