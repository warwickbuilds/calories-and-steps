import { palettes, resolveTheme, softTint, type ThemeId } from '../colors';

const ALL_THEMES: ThemeId[] = ['light', 'stone', 'dark', 'oled'];

describe('theme colour discipline', () => {
  it.each(ALL_THEMES)(
    '%s palette keeps steps green and calories orange distinct from chrome and other domains',
    (themeId) => {
      const p = palettes[themeId];
      const reserved = new Set([p.steps.toLowerCase(), p.calories.toLowerCase()]);

      expect(p.steps.toLowerCase()).not.toBe(p.calories.toLowerCase());
      expect(reserved.has(p.primary.toLowerCase())).toBe(false);
      expect(reserved.has(p.weight.toLowerCase())).toBe(false);
      expect(reserved.has(p.body.toLowerCase())).toBe(false);
      expect(reserved.has(p.milestone1.toLowerCase())).toBe(false);
      expect(reserved.has(p.milestone2.toLowerCase())).toBe(false);
      expect(reserved.has(p.milestone3.toLowerCase())).toBe(false);
      expect(reserved.has(p.milestone4.toLowerCase())).toBe(false);
      expect(reserved.has(p.protein.toLowerCase())).toBe(false);
      expect(reserved.has(p.carbs.toLowerCase())).toBe(false);
      expect(reserved.has(p.fat.toLowerCase())).toBe(false);
    },
  );

  it('resolves system, stone, and oled themes with the right light/dark polarity', () => {
    expect(resolveTheme('system', 'light').themeId).toBe('light');
    expect(resolveTheme('system', 'dark').themeId).toBe('dark');
    expect(resolveTheme('stone', 'dark')).toMatchObject({ themeId: 'stone', scheme: 'light' });
    expect(resolveTheme('oled', 'light')).toMatchObject({ themeId: 'oled', scheme: 'dark' });
    expect(resolveTheme('oled', 'light').colors.bg).toBe('#000000');
    // Unknown values fall back gracefully to system scheme
    expect(resolveTheme('unknown', 'dark').themeId).toBe('dark');
  });

  it('builds a valid 8-digit hex tint for 6-digit hex colours', () => {
    expect(softTint('#2F6FDE', '18')).toBe('#2F6FDE18');
    expect(softTint('#2F6FDE')).toBe('#2F6FDE1F');
    expect(softTint('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
  });
});
