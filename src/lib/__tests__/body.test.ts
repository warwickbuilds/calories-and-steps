import { bmi, bmiCategory, checkInReadiness, checkInTimestamp, navyBodyFat } from '../body';

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

describe('checkInReadiness', () => {
  const base = { female: false, neckCm: null, waistCm: null, hipCm: null, bodyFatPct: null, photoCount: 0 };

  it('needs measurements or photos', () => {
    expect(checkInReadiness(base)).toEqual({ ok: false, reason: 'Add measurements, photos or both.' });
  });

  it('saves photos only when no measurements are entered', () => {
    expect(checkInReadiness({ ...base, photoCount: 2 })).toEqual({ ok: true, measured: false });
  });

  it('asks for the missing measurement instead of saving half', () => {
    const r = checkInReadiness({ ...base, neckCm: 40, photoCount: 1 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/waist/);
    const f = checkInReadiness({ ...base, female: true, neckCm: 33, waistCm: 76 });
    expect(!f.ok && f.reason).toMatch(/hips/);
  });

  it('is measured when body fat can be worked out', () => {
    expect(checkInReadiness({ ...base, neckCm: 40, waistCm: 90, bodyFatPct: 18 })).toEqual({ ok: true, measured: true });
  });

  it('explains measurements that give no result', () => {
    const r = checkInReadiness({ ...base, neckCm: 90, waistCm: 40 });
    expect(!r.ok && r.reason).toMatch(/bigger than neck/);
  });
});

describe('checkInTimestamp', () => {
  const now = new Date(2026, 10, 24, 9, 30);

  it('uses now for a new check-in today', () => {
    expect(checkInTimestamp(new Date(2026, 10, 24), { now })).toBe(now);
  });

  it('uses midday for a new check-in on an earlier day', () => {
    expect(checkInTimestamp(new Date(2026, 10, 2), { now })).toEqual(new Date(2026, 10, 2, 12, 0));
  });

  it('keeps the original time of day when editing', () => {
    const keep = new Date(2026, 10, 20, 7, 15, 5);
    expect(checkInTimestamp(new Date(2026, 9, 1), { now, keepTimeOf: keep })).toEqual(new Date(2026, 9, 1, 7, 15, 5));
  });
});
