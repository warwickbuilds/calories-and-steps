/**
 * Thin wrapper around react-native-health-connect for reading daily steps.
 * Android only: on other platforms everything reports 'unsupported'.
 * The app only asks for READ_STEPS and never writes to Health Connect.
 */

import { Linking, Platform } from 'react-native';
import {
  SdkAvailabilityStatus,
  aggregateGroupByDuration,
  aggregateGroupByPeriod,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';

import type { StepBucket, StepsAccess } from './steps';

const PROVIDER = 'com.google.android.apps.healthdata';
const STEPS_READ = { accessType: 'read', recordType: 'Steps' } as const;

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;
  initialized = await initialize(PROVIDER);
  return initialized;
}

const hasStepsRead = (perms: { accessType?: string; recordType?: string }[]) =>
  perms.some((p) => p.accessType === 'read' && p.recordType === 'Steps');

/** Is Health Connect installed and has the app been allowed to read steps? Never throws. */
export async function getStepsAccess(): Promise<StepsAccess> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    const status = await getSdkStatus(PROVIDER);
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'not-installed';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update-required';
    if (!(await ensureInitialized())) return 'error';
    const granted = await getGrantedPermissions();
    return hasStepsRead(granted) ? 'granted' : 'not-granted';
  } catch {
    return 'error';
  }
}

/**
 * Shows Health Connect's permission sheet for steps. Returns true when steps
 * can be read afterwards. After two refusals Android stops showing the sheet,
 * so callers offer "Open Health Connect" when this returns false.
 */
export async function requestStepsAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!(await ensureInitialized())) return false;
  const granted = await requestPermission([STEPS_READ]);
  return hasStepsRead(granted);
}

/** Daily step totals between two local midnights, de-duplicated across apps by Health Connect. */
export async function readDailySteps(start: Date, end: Date): Promise<StepBucket[]> {
  if (!(await ensureInitialized())) return [];
  const groups = await aggregateGroupByPeriod({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  });
  return groups.map((g) => ({
    startTime: g.startTime,
    steps: g.result.COUNT_TOTAL,
    origins: g.result.dataOrigins ?? [],
  }));
}

/** Hourly step totals between two times (for today's graph). Start times come back as UTC instants. */
export async function readHourlySteps(start: Date, end: Date): Promise<{ startTime: string; steps: number }[]> {
  if (!(await ensureInitialized())) return [];
  const groups = await aggregateGroupByDuration({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    timeRangeSlicer: { duration: 'HOURS', length: 1 },
  });
  return groups.map((g) => ({ startTime: g.startTime, steps: g.result.COUNT_TOTAL }));
}

/** Health Connect's own settings, where access can be given or taken away. */
export function openHealthConnect() {
  try {
    openHealthConnectSettings();
  } catch {
    installHealthConnect();
  }
}

/** Play Store page for Health Connect (install or update). */
export function installHealthConnect() {
  const market = `market://details?id=${PROVIDER}&url=healthconnect%3A%2F%2Fonboarding`;
  Linking.openURL(market).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${PROVIDER}`),
  );
}
