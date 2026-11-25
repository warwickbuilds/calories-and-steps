/**
 * Thin wrapper around `expo-notifications` for local-only reminders.
 * This is the only file in the app that imports `expo-notifications`.
 */

import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  addNotificationResponseReceivedListener,
  cancelScheduledNotificationAsync,
  clearLastNotificationResponse,
  getAllScheduledNotificationsAsync,
  getLastNotificationResponse,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_ID_PREFIX, type ScheduledReminder } from './reminders';

export const REMINDER_CHANNEL_ID = 'reminders';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

// Allow banners & sounds when a notification arrives while the app is open
// (handy for testing reminders in Settings).
if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

/** Creates the Android notification channel. Must run before Android 13's permission prompt. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Reminders',
    description: 'Daily meal, weigh-in and evening check-in reminders.',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#F26A1B',
  });
  channelReady = true;
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const res = await getPermissionsAsync();
    if (res.granted) return 'granted';
    return res.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'blocked'> {
  if (Platform.OS === 'web') return 'denied';
  await ensureNotificationChannel();
  const current = await getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  const next = await requestPermissionsAsync();
  if (next.granted) return 'granted';
  return next.canAskAgain ? 'denied' : 'blocked';
}

// Serialize schedule updates so rapid food/weight writes never interleave cancels and schedules.
let syncQueue: Promise<void> = Promise.resolve();

/** Replaces all scheduled reminder notifications with `items`. */
export function applyReminderSchedule(items: ScheduledReminder[]): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  syncQueue = syncQueue
    .catch(() => {})
    .then(async () => {
      const existing = await getAllScheduledNotificationsAsync();
      for (const req of existing) {
        if (req.identifier.startsWith(REMINDER_ID_PREFIX)) {
          await cancelScheduledNotificationAsync(req.identifier);
        }
      }
      if (items.length === 0) return;

      const perm = await getPermissionsAsync();
      if (!perm.granted) return;

      await ensureNotificationChannel();
      for (const item of items) {
        await scheduleNotificationAsync({
          identifier: item.identifier,
          content: {
            title: item.title,
            body: item.body,
            data: { route: item.route },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: item.fireAt,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
      }
    });
  return syncQueue;
}

/** Schedules a one-off local test notification 3 seconds from now. */
export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return false;
  await scheduleNotificationAsync({
    content: {
      title: 'Reminders are working',
      body: 'Meal and weigh-in reminders will only nudge you when you haven’t logged yet.',
      data: { route: '/(tabs)' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
  return true;
}

/** Reads and clears the notification that cold-launched the app, if any. */
export function takeInitialNotificationData(): unknown {
  if (Platform.OS === 'web') return null;
  try {
    const res = getLastNotificationResponse();
    if (!res) return null;
    clearLastNotificationResponse();
    return res.notification.request.content.data;
  } catch {
    return null;
  }
}

/** Subscribes to taps on delivered notifications. */
export function subscribeNotificationTaps(onData: (data: unknown) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = addNotificationResponseReceivedListener((res) => {
    onData(res.notification.request.content.data);
  });
  return () => sub.remove();
}
