import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Bell, Moon, Scale, Sun, Sunrise, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { hapticSuccess, hapticTick } from '@/lib/haptics';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
} from '@/lib/notifications';
import {
  REMINDER_IDS,
  REMINDER_META,
  anyReminderEnabled,
  formatReminderTime,
  type ReminderId,
} from '@/lib/reminders';
import { updateReminderPref, useReminderSettings } from '@/lib/reminderState';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

const ICONS: Record<ReminderId, LucideIcon> = {
  weigh_in: Scale,
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  evening: Bell,
};

function dateForTime(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Local reminder toggles and time pickers for Settings → Reminders.
 * Meal and weigh-in reminders automatically skip today once logged.
 */
export function RemindersCard() {
  const { colors, scheme } = useTheme();
  const settings = useReminderSettings();
  const [iosPickerId, setIosPickerId] = useState<ReminderId | null>(null);
  const [permState, setPermState] = useState<'ok' | 'denied' | 'blocked' | 'unsupported'>('ok');
  const [testSent, setTestSent] = useState(false);

  const hasEnabled = anyReminderEnabled(settings);

  // Refresh permission state on mount and whenever the user returns from Android Settings.
  useEffect(() => {
    const check = async () => {
      const p = await getNotificationPermission();
      if (p === 'unsupported') setPermState('unsupported');
      else if (p === 'granted') setPermState('ok');
      else if (p === 'denied') setPermState('blocked');
    };
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, []);

  if (Platform.OS === 'web' || permState === 'unsupported') {
    return (
      <Card>
        <Text variant="label" muted>
          Local reminders are available on Android and iOS devices.
        </Text>
      </Card>
    );
  }

  const handleToggle = async (id: ReminderId, nextEnabled: boolean) => {
    setTestSent(false);
    if (!nextEnabled) {
      hapticTick();
      updateReminderPref(id, { enabled: false });
      return;
    }
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      setPermState('ok');
      hapticSuccess();
      updateReminderPref(id, { enabled: true });
    } else {
      setPermState(result);
    }
  };

  const openTimePicker = (id: ReminderId) => {
    const pref = settings[id];
    const value = dateForTime(pref.hour, pref.minute);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        onChange: (e, selected) => {
          if (e.type === 'set' && selected) {
            hapticTick();
            updateReminderPref(id, {
              hour: selected.getHours(),
              minute: selected.getMinutes(),
            });
          }
        },
      });
    } else {
      hapticTick();
      setIosPickerId((cur) => (cur === id ? null : id));
    }
  };

  const handleTest = async () => {
    const ok = await sendTestNotification();
    if (ok) {
      setPermState('ok');
      setTestSent(true);
      hapticSuccess();
    } else {
      setPermState('blocked');
    }
  };

  const toneColors = (tone: 'weight' | 'calories' | 'neutral') => {
    if (tone === 'weight') return { bg: colors.weightSoft, fg: colors.weight, track: colors.weight };
    if (tone === 'calories') return { bg: colors.caloriesSoft, fg: colors.calories, track: colors.calories };
    return { bg: colors.track, fg: colors.text, track: colors.primary };
  };

  return (
    <Card>
      <Text variant="label" muted>
        Stored and scheduled on this phone only — no server or account. Meal and weigh-in reminders are skipped
        automatically once you’ve logged them for the day.
      </Text>

      {permState === 'denied' || permState === 'blocked' ? (
        <View style={[styles.banner, { backgroundColor: colors.dangerSoft, borderColor: colors.cardBorder }]}>
          <Text variant="label" color={colors.danger}>
            {permState === 'blocked'
              ? 'Notifications are turned off for Calories and Steps in system settings.'
              : 'Notification permission wasn’t granted. Allow it to turn reminders on.'}
          </Text>
          {permState === 'blocked' ? (
            <Button
              variant="secondary"
              label="Open system settings"
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.list}>
        {REMINDER_IDS.map((id, idx) => {
          const meta = REMINDER_META[id];
          const pref = settings[id];
          const Icon = ICONS[id];
          const palette = toneColors(meta.tone);
          const timeText = formatReminderTime(pref.hour, pref.minute);

          return (
            <View
              key={id}
              style={[
                styles.rowWrap,
                idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
              ]}>
              <View style={styles.row}>
                <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
                  <Icon size={16} strokeWidth={2} color={palette.fg} />
                </View>
                <View style={styles.meta}>
                  <Text variant={pref.enabled ? 'bodyStrong' : 'bodyMedium'}>{meta.label}</Text>
                  <Text variant="caption" muted>
                    {meta.hint}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Change ${meta.label} time, currently ${timeText}`}
                  onPress={() => openTimePicker(id)}
                  style={({ pressed }) => [
                    styles.timeChip,
                    {
                      backgroundColor: pref.enabled ? colors.bg : colors.track,
                      borderColor: colors.cardBorder,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <Text variant="caption" muted={!pref.enabled} style={styles.timeText}>
                    {timeText}
                  </Text>
                </Pressable>
                <Switch
                  value={pref.enabled}
                  onValueChange={(next) => void handleToggle(id, next)}
                  trackColor={{ false: colors.track, true: palette.track }}
                  thumbColor={colors.surface}
                  accessibilityLabel={`${meta.label} reminder`}
                />
              </View>
              {Platform.OS === 'ios' && iosPickerId === id ? (
                <DateTimePicker
                  value={dateForTime(pref.hour, pref.minute)}
                  mode="time"
                  display="spinner"
                  themeVariant={scheme}
                  onChange={(_, selected) => {
                    if (selected) {
                      updateReminderPref(id, {
                        hour: selected.getHours(),
                        minute: selected.getMinutes(),
                      });
                    }
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {hasEnabled ? (
        <View style={styles.testBlock}>
          <Button variant="secondary" label="Send test notification" onPress={() => void handleTest()} />
          {testSent ? (
            <Text variant="caption" muted>
              Test notification scheduled — arrives in 3 seconds.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space[3],
    gap: space[2],
  },
  list: { gap: 0 },
  rowWrap: { paddingVertical: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    minHeight: layout.minTap + 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 1 },
  timeChip: {
    paddingHorizontal: space[2] + 2,
    paddingVertical: space[1] + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  timeText: { fontVariant: ['tabular-nums'] },
  testBlock: { gap: space[2], paddingTop: space[1] },
});
