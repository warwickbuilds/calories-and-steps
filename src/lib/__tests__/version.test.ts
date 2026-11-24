import { availableUpdate, compareVersions, parseVersion } from '../version';

describe('parseVersion', () => {
  it('reads plain and tag forms', () => {
    expect(parseVersion('0.3.0')).toEqual([0, 3, 0]);
    expect(parseVersion('v1.12.4')).toEqual([1, 12, 4]);
  });
  it('rejects anything else', () => {
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('v1.2.3-beta')).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions([0, 10, 0], [0, 9, 0])).toBeGreaterThan(0);
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
    expect(compareVersions([0, 2, 9], [0, 3, 0])).toBeLessThan(0);
  });
});

describe('availableUpdate', () => {
  const release = {
    tag_name: 'v0.4.0',
    html_url: 'https://github.com/o/r/releases/tag/v0.4.0',
    assets: [
      { name: 'notes.txt', browser_download_url: 'https://x/notes.txt' },
      { name: 'calories-and-steps-0.4.0.apk', browser_download_url: 'https://x/app.apk' },
    ],
  };

  it('offers a newer release with its APK link', () => {
    expect(availableUpdate('0.3.0', release)).toEqual({
      version: '0.4.0',
      downloadUrl: 'https://x/app.apk',
      pageUrl: release.html_url,
    });
  });
  it('falls back to the release page without an APK', () => {
    expect(availableUpdate('0.3.0', { ...release, assets: [] })?.downloadUrl).toBe(release.html_url);
  });
  it('stays quiet when current, older, draft or prerelease', () => {
    expect(availableUpdate('0.4.0', release)).toBeNull();
    expect(availableUpdate('0.5.0', release)).toBeNull();
    expect(availableUpdate('0.3.0', { ...release, prerelease: true })).toBeNull();
    expect(availableUpdate('0.3.0', { ...release, draft: true })).toBeNull();
    expect(availableUpdate(null, release)).toBeNull();
  });
});
