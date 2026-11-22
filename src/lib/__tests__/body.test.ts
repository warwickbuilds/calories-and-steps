import { bmi, bmiCategory, navyBodyFat } from '../body';

describe('bmi', () => {
  it('is weight over height squared', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
    expect(bmiCategory(24.69)).toBe('Healthy range');
    expect(bmiCategory(31)).toBe('Obese');
  });
});

describe('navyBodyFat', () => {
  it('matches the US Navy formula for men', () => {
    // height 70 in, neck 15 in, waist 34 in → about 17.6%
    const pct = navyBodyFat({ sex: 'male', heightCm: 70 * 2.54, neckCm: 15 * 2.54, waistCm: 34 * 2.54 });
    expect(pct).toBeCloseTo(86.01 * Math.log10(19) - 70.041 * Math.log10(70) + 36.76, 6);
  });

  it('matches the US Navy formula for women and needs hips', () => {
    const input = { sex: 'female' as const, heightCm: 65 * 2.54, neckCm: 13 * 2.54, waistCm: 30 * 2.54 };
    expect(navyBodyFat(input)).toBeNull();
    const pct = navyBodyFat({ ...input, hipCm: 38 * 2.54 });
    expect(pct).toBeCloseTo(163.205 * Math.log10(55) - 97.684 * Math.log10(65) - 78.387, 6);
  });

  it('rejects impossible measurements', () => {
    expect(navyBodyFat({ sex: 'male', heightCm: 180, neckCm: 40, waistCm: 38 })).toBeNull();
  });
});
