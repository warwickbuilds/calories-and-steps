/**
 * Daily calorie and macro targets.
 *
 * Maintenance = Mifflin-St Jeor BMR × activity factor. The goal mode applies a
 * flat daily offset to maintenance, never going below a safe floor.
 * All energy values are food calories (what labels call "Calories").
 */

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

export type GoalMode = 'hard_cut' | 'steady_cut' | 'maintain' | 'bulk';

export const ACTIVITY_LEVELS: Record<ActivityLevel, { factor: number; label: string; hint: string }> = {
  sedentary: { factor: 1.2, label: 'Sedentary', hint: 'Desk job, little exercise' },
  light: { factor: 1.375, label: 'Lightly active', hint: 'Exercise 1–3 days a week' },
  moderate: { factor: 1.55, label: 'Moderately active', hint: 'Exercise 3–5 days a week' },
  very: { factor: 1.725, label: 'Very active', hint: 'Hard exercise 6–7 days a week' },
  extra: { factor: 1.9, label: 'Extra active', hint: 'Physical job plus training' },
};

/** Calories per day relative to maintenance. */
export const GOAL_MODES: Record<GoalMode, { offset: number; label: string; hint: string }> = {
  hard_cut: { offset: -800, label: 'Hard cut', hint: '800 calories a day below maintenance' },
  steady_cut: { offset: -500, label: 'Steady cut', hint: '500 calories a day below maintenance' },
  maintain: { offset: 0, label: 'Maintain', hint: 'Eat at maintenance' },
  bulk: { offset: 500, label: 'Bulk', hint: '500 calories a day above maintenance' },
};

/** Lowest daily target the app will suggest. */
export const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };

export const STEP_TARGET = { min: 5000, max: 25000, step: 500, default: 10000 } as const;

/**
 * Age today, from the age the user entered and the local date (YYYY-MM-DD)
 * they entered it. Adds a year for each full year since, so the calorie
 * target keeps up without asking for a date of birth.
 */
export function currentAge(ageYears: number, setOn: string, on: Date = new Date()): number {
  const [y, m, d] = setOn.split('-').map(Number);
  let years = on.getFullYear() - y;
  const beforeAnniversary = on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d);
  if (beforeAnniversary) years -= 1;
  return ageYears + Math.max(0, years);
}

/** Mifflin-St Jeor basal metabolic rate, calories per day. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function maintenanceCalories(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
): number {
  return bmr(sex, weightKg, heightCm, age) * ACTIVITY_LEVELS[activity].factor;
}

export interface MacroOverrides {
  proteinGPerKg?: number;
  fatPct?: number;
}

export interface DailyTargets {
  maintenance: number;
  calories: number;
  /** True when the goal offset was limited by the safe floor. */
  flooredAtMinimum: boolean;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export const DEFAULT_PROTEIN_G_PER_KG = 2;
export const DEFAULT_FAT_PCT = 0.25;

export function dailyTargets(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: GoalMode;
  macros?: MacroOverrides | null;
}): DailyTargets {
  const maintenance = Math.round(
    maintenanceCalories(input.sex, input.weightKg, input.heightCm, input.age, input.activity),
  );
  const wanted = maintenance + GOAL_MODES[input.goal].offset;
  const floor = CALORIE_FLOOR[input.sex];
  const calories = Math.max(wanted, floor);

  const proteinPerKg = input.macros?.proteinGPerKg ?? DEFAULT_PROTEIN_G_PER_KG;
  const fatPct = input.macros?.fatPct ?? DEFAULT_FAT_PCT;
  const proteinG = Math.round(input.weightKg * proteinPerKg);
  const fatG = Math.round((calories * fatPct) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return {
    maintenance,
    calories,
    flooredAtMinimum: wanted < floor,
    proteinG,
    fatG,
    carbsG,
  };
}
