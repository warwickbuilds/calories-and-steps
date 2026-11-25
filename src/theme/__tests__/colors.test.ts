import { milestoneColor, palettes, softTint } from '../colors';

describe('theme colour discipline', () => {
  it.each(['light', 'dark'] as const)('%s palette keeps steps green and calories orange distinct from chrome and other domains', (scheme) => {
    const p = palettes[scheme];
    expect(p.primary).not.toBe(p.steps);
    expect(p.primary).not.toBe(p.calories);
    expect(p.weight).not.toBe(p.steps);
    expect(p.weight).not.toBe(p.calories);
    expect(p.body).not.toBe(p.steps);
    expect(p.body).not.toBe(p.calories);
    for (let i = 0; i < 4; i++) {
      expect(milestoneColor(p, i)).not.toBe(p.steps);
      expect(milestoneColor(p, i)).not.toBe(p.calories);
    }
  });

  it('softTint appends alpha hex only to 6-digit hex colours', () => {
    expect(softTint('#2F6FDE')).toBe('#2F6FDE1F');
    expect(softTint('#2F6FDE', '55')).toBe('#2F6FDE55');
    expect(softTint('rgba(0,0,0,0.1)')).toBe('rgba(0,0,0,0.1)');
  });
});
