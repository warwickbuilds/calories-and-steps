/**
 * Gemini API prices in US$ per million tokens (paid tier, standard), as
 * listed on Google's model docs on 2026-11-27. Thinking tokens are billed
 * as output. A model missing here just shows no cost in the report.
 * Check https://ai.google.dev/gemini-api/docs/pricing before a run and
 * update this table when prices change or a model is added.
 */
export const PRICES: Record<string, { input: number; output: number }> = {
  'gemini-4-hydrogen': { input: 1.5, output: 7.5 },
  'gemini-4-carbon': { input: 2.0, output: 10.0 },
  'gemini-4-neon': { input: 3.0, output: 15.0 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
  // gemini-3.6-flash and gemini-3.8-flash weren't on the pricing page yet: add them when they are.
};

export type Usage = { input: number; output: number };

/** Token counts from a Gemini generateContent response. */
export function geminiUsage(body: any): Usage | null {
  const u = body?.usageMetadata;
  if (!u) return null;
  return {
    input: u.promptTokenCount ?? 0,
    output: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
  };
}

export function costUsd(model: string, usage: Usage | null, prices = PRICES): number | null {
  const p = prices[model];
  if (!p || !usage) return null;
  return (usage.input * p.input + usage.output * p.output) / 1_000_000;
}
