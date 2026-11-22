import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeight,
  formatWeight,
  fromDisplayWeight,
  kgToLb,
  lbToKg,
  parseDecimal,
} from '../units';

describe('units', () => {
  it('round-trips kg and lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
    expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5, 6);
    expect(fromDisplayWeight(200, 'imperial')).toBeCloseTo(90.718, 2);
    expect(fromDisplayWeight(80, 'metric')).toBe(80);
  });

  it('converts feet and inches', () => {
    expect(feetInchesToCm(5, 11)).toBeCloseTo(180.34, 2);
    expect(cmToFeetInches(180.34)).toEqual({ feet: 5, inches: 11 });
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('formats for display', () => {
    expect(formatWeight(80, 'metric')).toBe('80.0 kg');
    expect(formatWeight(80, 'imperial')).toBe('176.4 lb');
    expect(formatHeight(180.34, 'imperial')).toBe('5 ft 11 in');
    expect(formatHeight(180.4, 'metric')).toBe('180 cm');
  });

  it('parses decimals with a comma or a point', () => {
    expect(parseDecimal('82,4')).toBe(82.4);
    expect(parseDecimal(' 82.4 ')).toBe(82.4);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});
