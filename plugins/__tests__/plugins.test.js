const { androidVersionCode } = require('../versionCode');
const { addReleaseSigning } = require('../withReleaseSigning');
const { addAbiSplits } = require('../withAbiSplits');

describe('androidVersionCode', () => {
  it('always goes up with the version', () => {
    expect(androidVersionCode('0.2.0')).toBe(200);
    expect(androidVersionCode('1.2.3')).toBe(10203);
    expect(androidVersionCode('0.99.99')).toBeLessThan(androidVersionCode('1.0.0'));
  });
  it('refuses versions it cannot encode', () => {
    expect(() => androidVersionCode('0.100.0')).toThrow();
    expect(() => androidVersionCode('next')).toThrow();
  });
});

describe('addReleaseSigning', () => {
  const gradle = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;

  it('adds a release key read from the environment', () => {
    const out = addReleaseSigning(gradle);
    expect(out).toContain("storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))");
    expect(out).toContain(
      "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug"
    );
    // Debug builds keep the debug key.
    expect(out).toMatch(/debug \{\s*signingConfig signingConfigs\.debug/);
  });
  it('runs only once', () => {
    const once = addReleaseSigning(gradle);
    expect(addReleaseSigning(once)).toBe(once);
  });
});

describe('addAbiSplits', () => {
  const gradle = `apply plugin: "com.android.application"

android {
    ndkVersion rootProject.ext.ndkVersion
    defaultConfig {
        versionCode 1
    }
}`;

  it('builds an arm64 APK and a universal APK', () => {
    const out = addAbiSplits(gradle);
    expect(out).toMatch(/android \{\n\s+splits \{/);
    expect(out).toContain("include 'arm64-v8a'");
    expect(out).toContain('universalApk true');
  });
  it('only adds the splits once', () => {
    expect(addAbiSplits(addAbiSplits(gradle))).toBe(addAbiSplits(gradle));
  });
  it('fails loudly when the template changes', () => {
    expect(() => addAbiSplits('plugins { }')).toThrow();
  });
});

describe('withWidgetRings', () => {
  const { ringDrawables, arcPath } = require('../withWidgetRings');
  const files = ringDrawables();
  const names = files.map((f) => f.name);

  it('makes a ring for every 5% in both themes, plus a full red over ring', () => {
    for (const kind of ['steps', 'calories']) {
      for (const theme of ['light', 'dark']) {
        for (let step = 0; step <= 100; step += 5) {
          expect(names).toContain(`widget_ring_${kind}_${theme}_${step}`);
        }
      }
    }
    expect(names).toContain('widget_ring_over_light_100');
    expect(names).toContain('widget_ring_over_dark_100');
    expect(files).toHaveLength(2 * 2 * 21 + 2);
  });

  it('uses valid Android resource names', () => {
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('draws only the track at 0% and an arc from the top otherwise', () => {
    const empty = files.find((f) => f.name === 'widget_ring_steps_light_0').xml;
    expect(empty.match(/<path/g)).toHaveLength(1);
    const half = files.find((f) => f.name === 'widget_ring_steps_light_50').xml;
    expect(half.match(/<path/g)).toHaveLength(2);
    expect(arcPath(25)).toBe('M50,5 A45,45 0 0,1 95,50');
    expect(arcPath(75)).toBe('M50,5 A45,45 0 1,1 5,50');
  });
});
