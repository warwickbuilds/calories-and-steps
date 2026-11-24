import { appendSpoken, GENERIC_VOICE_ERROR, voiceErrorMessage } from '../voice';

describe('voiceErrorMessage', () => {
  it('stays quiet when the user tapped stop, whatever the phone reports', () => {
    for (const code of ['client', 'unknown', 'network', 'busy']) {
      expect(voiceErrorMessage(code, { userStopped: true, heardText: false })).toBeNull();
    }
  });

  it('stays quiet for silence and aborts', () => {
    for (const code of ['aborted', 'no-speech', 'speech-timeout']) {
      expect(voiceErrorMessage(code, { userStopped: false, heardText: false })).toBeNull();
    }
  });

  it('keeps words heard before a client error without complaining', () => {
    expect(voiceErrorMessage('client', { userStopped: false, heardText: true })).toBeNull();
  });

  it('still explains real failures', () => {
    expect(voiceErrorMessage('not-allowed', { userStopped: false, heardText: false })).toMatch(/Microphone access/);
    expect(voiceErrorMessage('client', { userStopped: false, heardText: false })).toBe(GENERIC_VOICE_ERROR);
  });
});

describe('appendSpoken', () => {
  it('fills an empty box', () => {
    expect(appendSpoken('', ' Homemade banana bread ')).toBe('Homemade banana bread');
  });
  it('adds after typed text with one space', () => {
    expect(appendSpoken('About 100 g ', 'homemade')).toBe('About 100 g homemade');
  });
  it('ignores empty speech', () => {
    expect(appendSpoken('typed', '  ')).toBe('typed');
  });
});
