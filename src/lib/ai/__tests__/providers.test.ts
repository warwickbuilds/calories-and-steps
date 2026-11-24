import { AiError, buildRequest, errorForStatus, extractText, parseJsonLoose } from '../providers';
import { weightScreenshotRequest } from '../weightScreenshot';

const req = weightScreenshotRequest({ base64: 'QUJD', mimeType: 'image/jpeg' });

describe('buildRequest', () => {
  it('builds a Gemini generateContent call with the image and schema', () => {
    const r = buildRequest('gemini', 'gemini-3.6-flash', 'k', req);
    expect(r.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent');
    expect(r.headers['x-goog-api-key']).toBe('k');
    const body = r.body as any;
    expect(body.contents[0].parts[0]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: 'QUJD' } });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema).toBe(req.schema);
  });

  it('builds an OpenAI Responses call with a strict JSON schema', () => {
    const r = buildRequest('openai', 'gpt-6-luna', 'k', req);
    expect(r.url).toBe('https://api.openai.com/v1/responses');
    expect(r.headers.authorization).toBe('Bearer k');
    const body = r.body as any;
    expect(body.input[0].content[0].image_url).toBe('data:image/jpeg;base64,QUJD');
    expect(body.text.format).toMatchObject({ type: 'json_schema', name: 'weight_entries', strict: true });
  });

  it('builds a Claude Messages call with structured output', () => {
    const r = buildRequest('anthropic', 'claude-haiku-5-5', 'k', req);
    expect(r.url).toBe('https://api.anthropic.com/v1/messages');
    expect(r.headers['x-api-key']).toBe('k');
    const body = r.body as any;
    expect(body.messages[0].content[0].source).toEqual({ type: 'base64', media_type: 'image/jpeg', data: 'QUJD' });
    expect(body.output_config.format).toEqual({ type: 'json_schema', schema: req.schema });
  });
});

describe('extractText', () => {
  it('reads each provider’s answer', () => {
    expect(extractText('gemini', { candidates: [{ content: { parts: [{ text: '{"rows":[]}' }] } }] })).toBe('{"rows":[]}');
    expect(
      extractText('openai', { output: [{ type: 'message', content: [{ type: 'output_text', text: '{"a":1}' }] }] }),
    ).toBe('{"a":1}');
    expect(extractText('anthropic', { content: [{ type: 'text', text: '{"b":2}' }], stop_reason: 'end_turn' })).toBe(
      '{"b":2}',
    );
  });

  it('skips Gemini thought parts', () => {
    expect(
      extractText('gemini', { candidates: [{ content: { parts: [{ text: 'hmm', thought: true }, { text: '{}' }] } }] }),
    ).toBe('{}');
  });

  it('turns refusals into errors', () => {
    expect(() => extractText('anthropic', { stop_reason: 'refusal', content: [] })).toThrow(AiError);
    expect(() => extractText('gemini', { candidates: [{ finishReason: 'SAFETY' }] })).toThrow(AiError);
  });
});

describe('parseJsonLoose', () => {
  it('accepts fenced JSON', () => {
    expect(parseJsonLoose('```json\n{"rows":[]}\n```')).toEqual({ rows: [] });
  });
  it('throws on junk', () => {
    expect(() => parseJsonLoose('nope')).toThrow(AiError);
  });
});

describe('errorForStatus', () => {
  it('explains bad keys and rate limits', () => {
    expect(errorForStatus('gemini', 403).kind).toBe('auth');
    expect(errorForStatus('gemini', 400, 'API key not valid').kind).toBe('auth');
    expect(errorForStatus('openai', 429).kind).toBe('rate-limit');
  });
});
