/**
 * Searching Open Food Facts by name, for packaged foods without a barcode to
 * hand. Uses Open Food Facts' search service (search.openfoodfacts.org,
 * "search-a-licious"), filtered to the phone's country first because most
 * products are only sold in a few countries. No key is needed.
 */

import { OFF_FIELDS, OFF_TIMEOUT_MS, parseOffProduct, type Per100g } from './openFoodFacts';

export interface SearchHit {
  barcode: string;
  food: Per100g;
}

export interface Country {
  /** ISO region code, e.g. AU. */
  code: string;
  name: string;
  /** Open Food Facts country tag, e.g. en:australia. */
  tag: string;
}

/** Countries with a useful number of products in Open Food Facts. Others search everywhere. */
const COUNTRIES: Record<string, string> = {
  AU: 'Australia',
  NZ: 'New Zealand',
  GB: 'United Kingdom',
  IE: 'Ireland',
  US: 'United States',
  CA: 'Canada',
  ZA: 'South Africa',
  IN: 'India',
  SG: 'Singapore',
  MY: 'Malaysia',
  PH: 'Philippines',
  FR: 'France',
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  NL: 'Netherlands',
  ES: 'Spain',
  PT: 'Portugal',
  IT: 'Italy',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  MX: 'Mexico',
  BR: 'Brazil',
};

/** The Open Food Facts country for a locale such as "en-AU", or null when it isn't one we filter by. */
export function countryForLocale(locale: string | null | undefined): Country | null {
  if (!locale) return null;
  // "en-AU", "en_AU", "en-Latn-AU" or "en-AU-u-ca-gregory": the region is the 2-letter part after the language.
  const region = locale
    .split(/[-_]/)
    .slice(1)
    .find((p) => /^[A-Za-z]{2}$/.test(p));
  const code = region?.toUpperCase();
  const name = code ? COUNTRIES[code] : undefined;
  if (!code || !name) return null;
  return { code, name, tag: `en:${name.toLowerCase().replace(/ /g, '-')}` };
}

/** The phone's country, from its locale settings. */
export function deviceCountry(): Country | null {
  try {
    return countryForLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

/** Search fields: the product fields plus the barcode. "categories" is the search index's name for categories_tags. */
const SEARCH_FIELDS = `code,${OFF_FIELDS},categories`;
export const SEARCH_PAGE_SIZE = 25;

/** Characters that mean something in the search's query language, so a typed "M&M's (big)" stays plain text. */
const QUERY_SYNTAX = /[+\-!(){}[\]^"~*?:\\/&|<>=]/g;

export function cleanQuery(query: string): string {
  return query.replace(QUERY_SYNTAX, ' ').replace(/\s+/g, ' ').trim();
}

export function offSearchUrl(query: string, countryTag: string | null): string {
  const terms = cleanQuery(query);
  const q = countryTag ? `${terms} countries:"${countryTag}"` : terms;
  return `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=en&page_size=${SEARCH_PAGE_SIZE}&fields=${SEARCH_FIELDS}`;
}

/** "xx:sanitarium" or "sanitarium" → "Sanitarium"; mixed case is left alone. */
export function tidyBrand(brand: string): string {
  const b = brand.replace(/^[a-z]{2}:/, '').trim();
  if (b !== b.toLowerCase()) return b;
  return b.replace(/(^|[\s-])([a-z\u00e0-\u00fe])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Turns a search response into foods with calories. Hits without a calorie
 * figure are dropped (there's nothing to log), as are repeats of the same
 * name and brand, which the database often has under several barcodes.
 */
export function parseOffSearch(json: any): SearchHit[] {
  const hits: unknown = json?.hits;
  if (!Array.isArray(hits)) return [];
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const code = typeof h?.code === 'string' ? h.code.trim() : '';
    if (!code) continue;
    const brands = Array.isArray(h.brands) ? h.brands.filter((b: unknown) => typeof b === 'string') : h.brands;
    const product = {
      ...h,
      brands: Array.isArray(brands) ? brands.map(tidyBrand).join(',') : typeof brands === 'string' ? tidyBrand(brands) : '',
      categories_tags: h.categories_tags ?? h.categories,
    };
    const food = parseOffProduct({ status: 1, product });
    if (!food || food.name === 'Unnamed product') continue;
    const key = `${food.name.toLowerCase()}|${(food.brand ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ barcode: code, food });
  }
  return out;
}

export type SearchResult = { kind: 'results'; hits: SearchHit[] } | { kind: 'offline' };

/** Searches by name, optionally only in one country. Throws AbortError when `signal` aborts. */
export async function searchFoodDatabase(
  query: string,
  countryTag: string | null,
  appVersion: string,
  signal?: AbortSignal,
  timeoutMs = OFF_TIMEOUT_MS,
): Promise<SearchResult> {
  if (!cleanQuery(query)) return { kind: 'results', hits: [] };
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;
  try {
    const res = await fetch(offSearchUrl(query, countryTag), {
      headers: { 'User-Agent': `CaloriesAndSteps/${appVersion} (Android; github.com/warwickbuilds/calories-and-steps)` },
      signal: controller.signal,
    });
    if (!res.ok) return { kind: 'offline' };
    return { kind: 'results', hits: parseOffSearch(await res.json().catch(() => null)) };
  } catch (e) {
    if (!timedOut && (signal?.aborted || (e as Error)?.name === 'AbortError')) throw e;
    return { kind: 'offline' };
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
