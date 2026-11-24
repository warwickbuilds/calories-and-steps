/**
 * Step sync state shared by Today, the Steps screen and Settings.
 * Steps are read from Health Connect when the app opens or comes back to the
 * front (at most once a minute), and on "Sync now". Synced days are saved in
 * the steps_day table, which the screens read through live queries.
 */

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Alert, AppState } from 'react-native';

import { saveStepDays, stepsForDayQuery, stepsRangeQuery } from '@/db/steps';
import { addDays, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import {
  getStepsAccess,
  installHealthConnect,
  openHealthConnect,
  readDailySteps,
  readHourlySteps,
  requestStepsAccess,
} from '@/lib/healthConnect';
import { bucketsToDays, hourlyFromBuckets, stepsHistory, syncWindow, type StepsAccess } from '@/lib/steps';

const MIN_SYNC_GAP_MS = 60 * 1000;

export interface StepsSyncState {
  /** null until the first check has finished. */
  access: StepsAccess | null;
  syncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  /** Today's steps per local hour (24 numbers), kept in memory only. */
  todayHours: { day: string; hours: number[] } | null;
}

let state: StepsSyncState = { access: null, syncing: false, lastSyncedAt: null, error: null, todayHours: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<StepsSyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let inFlight: Promise<void> | null = null;

/** Checks access and, when allowed, reads the last 30 days into the database. */
export function syncSteps({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (inFlight) return inFlight;
  if (!force && state.lastSyncedAt && Date.now() - state.lastSyncedAt.getTime() < MIN_SYNC_GAP_MS) {
    return Promise.resolve();
  }
  inFlight = (async () => {
    const access = await getStepsAccess();
    if (access !== 'granted') {
      setState({ access, syncing: false });
      return;
    }
    setState({ access, syncing: true, error: null });
    try {
      const { start, end } = syncWindow();
      await saveStepDays(bucketsToDays(await readDailySteps(start, end)));
      const today = toLocalDateString();
      const midnight = fromLocalDateString(today);
      const hours = hourlyFromBuckets(await readHourlySteps(midnight, addDays(midnight, 1)), today);
      setState({ syncing: false, lastSyncedAt: new Date(), todayHours: { day: today, hours } });
    } catch (e) {
      setState({ syncing: false, error: e instanceof Error ? e.message : 'Steps couldn’t be read.' });
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * The "Connect" button: installs or updates Health Connect when needed,
 * otherwise asks for access to steps and syncs straight away.
 */
export async function connectSteps(): Promise<void> {
  const access = await getStepsAccess();
  setState({ access });
  if (access === 'not-installed' || access === 'update-required') {
    installHealthConnect();
    return;
  }
  if (access === 'granted') {
    await syncSteps({ force: true });
    return;
  }
  if (access === 'error') {
    Alert.alert(
      'Health Connect didn’t respond',
      'Try again in a moment, or open Health Connect to check that it’s set up and allowed to share steps.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Health Connect', onPress: openHealthConnect },
      ],
    );
    return;
  }
  if (access !== 'not-granted') return;

  let allowed = false;
  try {
    allowed = await requestStepsAccess();
  } catch {
    allowed = false;
  }
  if (allowed) {
    await syncSteps({ force: true });
    return;
  }
  setState({ access: 'not-granted' });
  Alert.alert(
    'Steps not connected',
    'To show your steps, allow Calories and Steps to read steps in Health Connect. If the permission sheet didn’t appear, open Health Connect, choose App permissions, then Calories and Steps.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Health Connect', onPress: openHealthConnect },
    ],
  );
}

export function useStepsSync(): StepsSyncState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Syncs on mount and whenever the app comes back to the front. Used once, in the tabs layout. */
export function useStepsAutoSync() {
  useEffect(() => {
    syncSteps();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncSteps();
    });
    return () => sub.remove();
  }, []);
}

/** Steps for one day from the database, or null when there is no data. */
export function useDaySteps(day: string = toLocalDateString()): number | null {
  const { data } = useLiveQuery(stepsForDayQuery(day), [day]);
  return data?.[0]?.steps ?? null;
}

/** The last `days` days ending today, oldest first, with null where there's no data. */
export function useStepsHistory(days: number, today: string = toLocalDateString()) {
  const from = toLocalDateString(addDays(fromLocalDateString(today), -(days - 1)));
  const { data } = useLiveQuery(stepsRangeQuery(from, today), [from, today]);
  return useMemo(() => stepsHistory(data ?? [], today, days), [data, today, days]);
}
