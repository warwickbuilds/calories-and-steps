import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cleanQuery, deviceCountry, searchFoodDatabase, type Country, type SearchHit } from '@/lib/foodSearch';
import { installedVersion } from '@/lib/updates';

export type FoodSearchState =
  | { kind: 'idle' }
  | { kind: 'loading'; query: string }
  | { kind: 'results'; query: string; hits: SearchHit[]; country: Country | null }
  | { kind: 'offline'; query: string };

/**
 * Name search in Open Food Facts, run only when asked (a tap or the
 * keyboard's search key) so typing doesn't fire a request per letter. Searches
 * the phone's country first; when that finds nothing it tries every country.
 */
export function useFoodDatabaseSearch(query: string) {
  const home = useMemo(() => deviceCountry(), []);
  const [state, setState] = useState<FoodSearchState>({ kind: 'idle' });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const term = cleanQuery(query);
  // Results belong to the words they were for; typing something else hides them.
  const current: FoodSearchState = state.kind !== 'idle' && state.query !== term ? { kind: 'idle' } : state;

  const search = useCallback(
    async (everywhere = false) => {
      if (term.length < 2) return;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setState({ kind: 'loading', query: term });
      const version = installedVersion() ?? '0';
      try {
        const country = everywhere ? null : home;
        let result = await searchFoodDatabase(term, country?.tag ?? null, version, controller.signal);
        if (result.kind === 'results' && result.hits.length === 0 && country) {
          result = await searchFoodDatabase(term, null, version, controller.signal);
          if (controller.signal.aborted) return;
          setState(result.kind === 'results' ? { ...result, query: term, country: null } : { kind: 'offline', query: term });
          return;
        }
        if (controller.signal.aborted) return;
        setState(result.kind === 'results' ? { ...result, query: term, country } : { kind: 'offline', query: term });
      } catch (e) {
        if (controller.signal.aborted || (e as Error)?.name === 'AbortError') return;
        setState({ kind: 'offline', query: term });
      }
    },
    [term, home],
  );

  return { state: current, search, home, canSearch: term.length >= 2 };
}
