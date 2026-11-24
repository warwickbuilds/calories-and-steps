/**
 * Provider-agnostic AI adapter. Every feature that needs an AI model
 * (screenshot import now, meal estimates in Phase 3) describes its request
 * once as an AiJsonRequest; each provider turns it into its own HTTP call
 * and hands back the parsed JSON.
 *
 * Calls go straight from the phone to the provider with the user's own key.
 * The request builders and response parsers are pure so they can be tested.
 */

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export const AI_PROVIDERS: Record<
  AiProvider,
  { label: string; company: string; keyUrl: string; keyHint: string; defaultModel: string }
> = {
  gemini: {
    label: 'Gemini',
    company: 'Google',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'Starts with AIza',
    defaultModel: 'gemini-3.6-flash',
  },
  openai: {
    label: 'OpenAI',
    company: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'Starts with sk-',
    defaultModel: 'gpt-6-luna',
  },
  anthropic: {
    label: 'Claude',
    company: 'Anthropic',
    keyUrl: 'https://platform.claude.com/settings/keys',
    keyHint: 'Starts with sk-ant-',
    defaultModel: 'claude-haiku-5-5',
  },
};

export type AiImage = { mimeType: 'image/jpeg' | 'image/png'; base64: string };

export type AiJsonRequest = {
  /** Instructions for the model. */
  prompt: string;
  images: AiImage[];
  /** JSON Schema for the answer. Use only the subset all three providers accept:
   * object/array/string/number/integer/boolean, enum, required, nullable via type arrays,
   * and additionalProperties: false on every object. */
  schema: Record<string, unknown>;
  /** Short name for the schema (OpenAI requires one). */
  schemaName: string;
  maxOutputTokens?: number;
};

export type HttpRequest = { url: string; headers: Record<string, string>; body: unknown };

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate-limit' | 'refused' | 'bad-response' | 'network' | 'other',
  ) {
    super(message);
  }
}

export function buildRequest(provider: AiProvider, model: string, apiKey: string, req: AiJsonRequest): HttpRequest {
  const maxTokens = req.maxOutputTokens ?? 8000;
  switch (provider) {
    case 'gemini':
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: {
          contents: [
            {
              role: 'user',
              parts: [
                ...req.images.map((i) => ({ inline_data: { mime_type: i.mimeType, data: i.base64 } })),
                { text: req.prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: req.schema,
            maxOutputTokens: maxTokens,
            thinkingConfig: { thinkingLevel: 'LOW' },
          },
        },
      };
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/responses',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: {
          model,
          input: [
            {
              role: 'user',
              content: [
                ...req.images.map((i) => ({
                  type: 'input_image',
                  image_url: `data:${i.mimeType};base64,${i.base64}`,
                  detail: 'high',
                })),
                { type: 'input_text', text: req.prompt },
              ],
            },
          ],
          text: { format: { type: 'json_schema', name: req.schemaName, schema: req.schema, strict: true } },
          reasoning: { effort: 'low' },
          max_output_tokens: maxTokens,
        },
      };
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model,
          max_tokens: maxTokens,
          output_config: { effort: 'low', format: { type: 'json_schema', schema: req.schema } },
          messages: [
            {
              role: 'user',
              content: [
                ...req.images.map((i) => ({
                  type: 'image',
                  source: { type: 'base64', media_type: i.mimeType, data: i.base64 },
                })),
                { type: 'text', text: req.prompt },
              ],
            },
          ],
        },
      };
  }
}

/** Pulls the answer text out of a provider's response body. */
export function extractText(provider: AiProvider, body: any): string {
  switch (provider) {
    case 'gemini': {
      const cand = body?.candidates?.[0];
      if (!cand) {
        if (body?.promptFeedback?.blockReason) throw new AiError('The request was blocked by Gemini.', 'refused');
        throw new AiError('Gemini returned no answer.', 'bad-response');
      }
      if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') {
        throw new AiError('Gemini declined to read this image.', 'refused');
      }
      const parts: any[] = cand.content?.parts ?? [];
      return parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('');
    }
    case 'openai': {
      if (typeof body?.output_text === 'string') return body.output_text;
      const texts: string[] = [];
      for (const item of body?.output ?? []) {
        for (const c of item?.content ?? []) {
          if (c.type === 'refusal') throw new AiError('OpenAI declined to read this image.', 'refused');
          if (c.type === 'output_text' && typeof c.text === 'string') texts.push(c.text);
        }
      }
      return texts.join('');
    }
    case 'anthropic': {
      if (body?.stop_reason === 'refusal') throw new AiError('Claude declined to read this image.', 'refused');
      return (body?.content ?? [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('');
    }
  }
}

/** Parses JSON, tolerating a ```json fence or text around the object. */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new AiError('The AI answer wasn’t valid JSON.', 'bad-response');
  }
}

/** Turns an HTTP error status into a message a person can act on. */
export function errorForStatus(provider: AiProvider, status: number, detail?: string): AiError {
  const name = AI_PROVIDERS[provider].label;
  if (status === 401 || status === 403) {
    return new AiError(`${name} didn’t accept the API key. Check it in Settings.`, 'auth');
  }
  if (status === 400 && detail && /api[ _-]?key/i.test(detail)) {
    return new AiError(`${name} didn’t accept the API key. Check it in Settings.`, 'auth');
  }
  if (status === 429) {
    return new AiError(`${name} says you’ve hit a rate or spending limit. Wait a minute and try again.`, 'rate-limit');
  }
  if (status === 404) {
    return new AiError(`${name} doesn’t recognise the model name. Check it in Settings.`, 'other');
  }
  return new AiError(`${name} returned an error (${status})${detail ? `: ${detail}` : ''}.`, 'other');
}

/** Sends one request and returns the parsed JSON answer. */
export async function requestJson(
  provider: AiProvider,
  model: string,
  apiKey: string,
  req: AiJsonRequest,
  signal?: AbortSignal,
): Promise<unknown> {
  const http = buildRequest(provider, model, apiKey, req);
  let res: Response;
  try {
    res = await fetch(http.url, {
      method: 'POST',
      headers: http.headers,
      body: JSON.stringify(http.body),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new AiError('Couldn’t reach the AI provider. Check your connection.', 'network');
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Some errors have no JSON body.
  }
  if (!res.ok) {
    const detail: string | undefined = body?.error?.message ?? body?.message;
    throw errorForStatus(provider, res.status, detail?.slice(0, 200));
  }
  return parseJsonLoose(extractText(provider, body));
}
