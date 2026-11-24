import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Mic, Square } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is off. Turn it on in Android settings, or type instead.',
  'language-not-supported':
    'On-device speech isn’t set up for your language. Use the microphone on your keyboard, or type instead.',
  'service-not-allowed': 'Speech recognition isn’t available on this phone. Use the keyboard’s microphone, or type.',
  network: 'Speech recognition needs a connection on this phone. Try again, or type instead.',
  'audio-capture': 'Couldn’t use the microphone. Try again.',
};

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
 */
export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { colors } = useTheme();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setInterim('');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      if (text.trim()) onText(text.trim());
      setInterim('');
    } else {
      setInterim(text);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'aborted' || e.error === 'no-speech') return;
    setError(ERRORS[e.error] ?? 'Speech recognition stopped. Try again, or type instead.');
  });

  const start = async () => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError(ERRORS['not-allowed']);
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError(ERRORS['service-not-allowed']);
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

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Describe it out loud'}
        onPress={() => (listening ? ExpoSpeechRecognitionModule.stop() : start())}
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
