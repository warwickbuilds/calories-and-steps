import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { voiceErrorMessage, voiceErrorText } from '@/lib/voice';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/** The phone's language, e.g. "en-AU", for the recogniser. */
const deviceLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
};

/**
 * Tap to talk, tap again to stop. Speech is turned into text on the phone
 * where it supports that (on-device recognition), and only the text is used.
 *
 * The words shown while listening are kept even when the phone ends without a
 * final result: some on-device recognisers report an error instead when you
 * tap stop, so whatever was last heard goes into the box when listening ends.
 */
export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { colors } = useTheme();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Words heard but not yet confirmed as final. */
  const pending = useRef('');
  /** True once the user taps stop, so the phone's "error" on stopping isn't shown. */
  const userStopped = useRef(false);
  const listeningRef = useRef(false);

  useEffect(
    () => () => {
      if (listeningRef.current) {
        userStopped.current = true;
        ExpoSpeechRecognitionModule.abort();
      }
    },
    [],
  );

  const flushPending = () => {
    const text = pending.current.trim();
    pending.current = '';
    if (text) onText(text);
  };

  useSpeechRecognitionEvent('start', () => {
    listeningRef.current = true;
    setListening(true);
  });
  useSpeechRecognitionEvent('end', () => {
    listeningRef.current = false;
    flushPending();
    userStopped.current = false;
    setListening(false);
    setInterim('');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      pending.current = '';
      if (text.trim()) onText(text.trim());
      setInterim('');
    } else {
      pending.current = text;
      setInterim(text);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    const message = voiceErrorMessage(e.error, {
      userStopped: userStopped.current,
      heardText: pending.current.trim().length > 0,
    });
    flushPending();
    setInterim('');
    if (message) setError(message);
  });

  const start = async () => {
    setError(null);
    pending.current = '';
    userStopped.current = false;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError(voiceErrorText('not-allowed'));
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError(voiceErrorText('service-not-allowed'));
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: deviceLocale(),
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
      addsPunctuation: true,
    });
  };

  const stop = () => {
    userStopped.current = true;
    ExpoSpeechRecognitionModule.stop();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Describe it out loud'}
        onPress={() => (listening ? stop() : start())}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: listening ? colors.primary : colors.track, opacity: pressed ? 0.75 : 1 },
        ]}>
        {listening ? (
          <Square size={18} strokeWidth={2.2} color={colors.onPrimary} />
        ) : (
          <Mic size={20} strokeWidth={1.8} color={colors.text} />
        )}
        <Text variant="bodyStrong" color={listening ? colors.onPrimary : colors.text}>
          {listening ? 'Listening… tap to stop' : 'Describe it out loud'}
        </Text>
      </Pressable>
      {interim ? (
        <Text variant="label" muted>
          {interim}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  button: {
    minHeight: layout.minTap,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[5],
  },
});
