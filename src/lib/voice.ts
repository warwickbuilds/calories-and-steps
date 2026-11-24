/**
 * Rules for the "Describe it out loud" button, kept free of React and the
 * speech module so they can be tested.
 */

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is off. Turn it on in Android settings, or type instead.',
  'language-not-supported':
    'On-device speech isn’t set up for your language. Use the microphone on your keyboard, or type instead.',
  'service-not-allowed': 'Speech recognition isn’t available on this phone. Use the keyboard’s microphone, or type.',
  network: 'Speech recognition needs a connection on this phone. Try again, or type instead.',
  'audio-capture': 'Couldn’t use the microphone. Try again.',
};

export const GENERIC_VOICE_ERROR = 'Speech recognition stopped. Try again, or type instead.';

/** Errors that only mean "nothing more to hear", never worth showing. */
const QUIET = new Set(['aborted', 'no-speech', 'speech-timeout']);

export function voiceErrorText(code: string): string {
  return ERRORS[code] ?? GENERIC_VOICE_ERROR;
}

/**
 * What to show when the recogniser reports an error, or null for nothing.
 * Some phones' on-device recognisers end with an error (often "client")
 * instead of a final result when you tap stop, so an error after the user
 * stopped, or after we already heard words, is not shown: the words are kept.
 */
export function voiceErrorMessage(
  code: string,
  ctx: { userStopped: boolean; heardText: boolean },
): string | null {
  if (QUIET.has(code)) return null;
  if (ctx.userStopped) return null;
  if (ctx.heardText && code === 'client') return null;
  return voiceErrorText(code);
}

/** Adds spoken text to what's already in the box, with one space between. */
export function appendSpoken(existing: string, spoken: string): string {
  const a = existing.trim();
  const b = spoken.trim();
  if (!b) return existing;
  return a ? `${a} ${b}` : b;
}
