/**
 * "New version available" check for sideloaded Android installs. The app
 * asks GitHub for the latest release at most once a day and offers the APK
 * when it is newer than the installed version. Nothing is sent except the
 * request itself; no account or token is involved.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { availableUpdate, type AvailableUpdate, type ReleaseInfo } from './version';

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const STATE_FILE = 'update-check.json';

interface CheckState {
  lastCheckedAt?: string;
  latest?: AvailableUpdate | null;
  dismissedVersion?: string;
}

export const installedVersion = (): string | null => Constants.expoConfig?.version ?? null;

/** "owner/name" of the GitHub repo that publishes the APKs (app.json → extra.releasesRepo). */
export const releasesRepo = (): string | null =>
  (Constants.expoConfig?.extra?.releasesRepo as string | undefined) ?? null;

function stateFile() {
  return new File(Paths.document, STATE_FILE);
}

function readState(): CheckState {
  try {
    const f = stateFile();
    return f.exists ? (JSON.parse(f.textSync()) as CheckState) : {};
  } catch {
    return {};
  }
}

function writeState(state: CheckState) {
  try {
    const f = stateFile();
    if (!f.exists) f.create();
    f.writeSync(JSON.stringify(state));
  } catch {
    // A failed write only means we check again sooner.
  }
}

export type CheckResult =
  | { status: 'update'; update: AvailableUpdate }
  | { status: 'current' }
  | { status: 'unavailable' };

/** Asks GitHub for the latest release. Never throws. */
export async function checkForUpdate(): Promise<CheckResult> {
  const repo = releasesRepo();
  if (!repo) return { status: 'unavailable' };
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    // 404 means no release yet, or the repo is private.
    if (!res.ok) return { status: 'unavailable' };
    const update = availableUpdate(installedVersion(), (await res.json()) as ReleaseInfo, Device.supportedCpuArchitectures);
    writeState({ ...readState(), lastCheckedAt: new Date().toISOString(), latest: update });
    return update ? { status: 'update', update } : { status: 'current' };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Hides the cached update once it is dismissed or already installed. */
function visible(update: AvailableUpdate | null | undefined, dismissedVersion?: string): AvailableUpdate | null {
  if (!update || update.version === dismissedVersion) return null;
  return availableUpdate(installedVersion(), { tag_name: update.version, html_url: update.pageUrl }) ? update : null;
}

function isFresh(state: CheckState): boolean {
  return !!state.lastCheckedAt && Date.now() - Date.parse(state.lastCheckedAt) < CHECK_EVERY_MS;
}

/** Update to show on the Today screen, or null. Checks GitHub at most once a day, on Android only. */
export function useUpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(() => {
    if (Platform.OS !== 'android') return null;
    const state = readState();
    return visible(state.latest, state.dismissedVersion);
  });

  useEffect(() => {
    if (Platform.OS !== 'android' || isFresh(readState())) return;
    let cancelled = false;
    checkForUpdate().then((r) => {
      if (!cancelled && r.status === 'update') setUpdate(visible(r.update, readState().dismissedVersion));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (update) writeState({ ...readState(), dismissedVersion: update.version });
    setUpdate(null);
  }, [update]);

  return { update, dismiss };
}
