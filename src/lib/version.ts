/**
 * App version helpers for the update check. The version in app.json
 * ("0.2.0") is the single source; releases are tagged "v0.2.0" and Android's
 * versionCode is derived from it in plugins/versionCode.js.
 */

export type Version = [major: number, minor: number, patch: number];

/** Parses "0.3.0" or "v0.3.0". Returns null for anything else. */
export function parseVersion(text: string | null | undefined): Version | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((text ?? '').trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** The bits of a GitHub release the update check reads. */
export interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string }[];
}

export interface AvailableUpdate {
  version: string;
  /** Direct APK link when the release has one, otherwise the release page. */
  downloadUrl: string;
  pageUrl: string;
}

/** Returns the update to offer, or null when the installed version is current. */
export function availableUpdate(installed: string | null | undefined, release: ReleaseInfo): AvailableUpdate | null {
  if (release.draft || release.prerelease) return null;
  const latest = parseVersion(release.tag_name);
  const current = parseVersion(installed);
  if (!latest || !current || compareVersions(latest, current) <= 0) return null;
  const apk = release.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'));
  return {
    version: latest.join('.'),
    downloadUrl: apk?.browser_download_url ?? release.html_url,
    pageUrl: release.html_url,
  };
}
