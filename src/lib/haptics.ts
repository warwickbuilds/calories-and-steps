import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Subtle cross-platform haptic helpers. On Android we use the native haptics
 * engine (`performAndroidHapticsAsync`), as recommended by Expo SDK 58, so
 * ticks feel crisp without falling back to the Vibrator API.
 */

const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  try {
    void fn().catch(() => {});
  } catch {
    // Ignore on simulators or devices without haptic hardware.
  }
};

/** Very light selection tick (chart scrub, segmented controls, theme switch). */
export function hapticTick() {
  safe(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick)
      : Haptics.selectionAsync(),
  );
}

/** Crisp light press feedback for primary buttons and quick-add buttons. */
export function hapticTap() {
  safe(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );
}

/** Confirmation pulse when logging food, saving a weigh-in, or reaching a goal. */
export function hapticSuccess() {
  safe(() =>
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}
