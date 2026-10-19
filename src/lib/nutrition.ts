import type {
  Activity,
  Entry,
  FoodDraft,
  Goal,
  Meal,
  Nutrition,
  Profile,
  Sex,
  Units,
} from "./types";
import { EMPTY_NUTRITION } from "./types";

/* ---------- dates (all local-time, YYYY-MM-DD keys) ---------- */

export function toKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function todayKey(): string {
  return toKey(new Date());
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function isValidKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromKey(key).getTime());
}

/* ---------- body maths ---------- */

export function bmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const m = heightCm / 100;
  return weightKg / (m * m);
}
export function bmiCategory(v: number): string {
  if (!v) return "—";
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Healthy";
  if (v < 30) return "Overweight";
  return "Obese";
}
/** Mifflin–St Jeor (1990). The sex constant is +5 for men and −161 for women; when we
 *  don't know (older accounts) we use the midpoint so the estimate is neither high nor low. */
export function bmr(heightCm: number, weightKg: number, age: number, sex: Sex | null = null): number {
  if (!heightCm || !weightKg || !age) return 0;
  const k = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + k);
}
export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};
export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
};
export const ACTIVITY_HINT: Record<Activity, string> = {
  sedentary: "Desk job, little exercise",
  light: "Workouts 1–3 days a week",
  moderate: "Workouts 3–5 days a week",
  active: "Hard training 6–7 days, or a physical job",
};

/* ---------- the plan ---------- *
 * Every number here has a source or is marked as our own rule:
 *  - Resting burn: Mifflin–St Jeor 1990.
 *  - Protein: gains level off at about 1.6 g per kg (Morton 2018); a little more when cutting (Helms 2014).
 *    The exact 2.0 / 1.6 / 1.8 g per kg per goal are our rule.
 *  - Fat 20–35% and carbohydrate 45–65% of calories: US Dietary Reference Intakes (AMDR). Our default fat is 27%.
 *  - Fibre 14 g per 1,000 kcal (US DRI). Sodium upper level 2,300 mg (US DRI). Free sugars under 10% of energy (WHO).
 *  - A deficit of about 500 kcal (roughly 0.45 kg a week) is a safe pace (CDC). Our rule: never more than 20% of burn.
 *  - Calorie floors of 1,500 (men) and 1,200 (women) are our rule.
 */
export const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 };
export const DEFAULT_FAT_PCT = 27;
export const PROTEIN_STANDARD = { min: 1.2, max: 2.2 };
export const PROTEIN_RANGE = { min: 1.0, max: 2.6 };
export const FAT_STANDARD = { min: 20, max: 35 };
export const FAT_RANGE = { min: 15, max: 40 };

export interface PlanInput {
  sex: Sex | null;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activity: Activity;
  goal: Goal;
}
export interface Plan {
  bmr: number;
  tdee: number;
  calories: number;
  /** calories below (negative) or above (positive) what you burn */
  adjust: number;
  /** kg per week at this pace (positive = losing when goal is lose) */
  kgPerWeek: number;
  proteinPerKg: number;
  fatPct: number;
}

export function calorieFloor(sex: Sex | null): number {
  return sex === "female" ? 1200 : 1500;
}

export function makePlan(p: PlanInput): Plan {
  const b = bmr(p.heightCm, p.weightKg, p.age, p.sex);
  const tdee = b * ACTIVITY_FACTOR[p.activity];
  const adj = p.goal === "lose" ? -Math.min(500, 0.2 * tdee) : p.goal === "gain" ? 300 : 0;
  const calories = Math.max(calorieFloor(p.sex), Math.round((tdee + adj) / 10) * 10 || 2000);
  return {
    bmr: b,
    tdee: Math.round(tdee),
    calories,
    adjust: Math.round(calories - tdee),
    kgPerWeek: Math.round((Math.abs(tdee - calories) * 7) / 7700 * 100) / 100,
    proteinPerKg: PROTEIN_PER_KG[p.goal],
    fatPct: DEFAULT_FAT_PCT,
  };
}

/** Back-compat helper: the daily calorie number for a set of body details. */
export function dailyCalorieGoal(p: PlanInput): number {
  return makePlan(p).calories;
}

/** Body weight the protein target is counted on: your own, or your goal weight if you are well above a healthy BMI. */
export function proteinBasisKg(p: Pick<Profile, "weightKg" | "heightCm" | "targetWeightKg" | "goal">): number {
  return p.goal === "lose" && bmi(p.heightCm, p.weightKg) >= 30 && p.targetWeightKg > 0 ? p.targetWeightKg : p.weightKg;
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}
export type GoalInput = Pick<Profile, "calorieGoal" | "proteinPerKg" | "fatPct" | "weightKg" | "heightCm" | "targetWeightKg" | "goal">;
export function goalsFor(p: GoalInput): Goals {
  const kc = p.calorieGoal;
  // protein never more than 35% of calories (the top of the US DRI range)
  const protein = Math.min(p.proteinPerKg * proteinBasisKg(p), (0.35 * kc) / 4);
  const fat = (p.fatPct / 100) * kc / 9;
  const pr = Math.round(protein);
  const fa = Math.round(fat);
  const carbs = Math.max(0, Math.round((kc - pr * 4 - fa * 9) / 4));
  return {
    calories: kc,
    protein: pr,
    carbs,
    fat: fa,
    fiber: Math.max(20, Math.round((kc / 1000) * 14)),
    sugar: Math.round((0.1 * kc) / 4),
    sodium: 2300,
  };
}
/** Share of calories (whole percents, summing to ~100) for each macro of a goal set. */
export function macroPercents(g: Goals): { protein: number; carbs: number; fat: number } {
  const t = g.protein * 4 + g.carbs * 4 + g.fat * 9 || 1;
  return {
    protein: Math.round((g.protein * 4 * 100) / t),
    carbs: Math.round((g.carbs * 4 * 100) / t),
    fat: Math.round((g.fat * 9 * 100) / t),
  };
}

/* ---------- units ---------- */

export function formatHeight(cm: number, units: Units): string {
  if (units === "imperial") {
    const totalIn = Math.round(cm / 2.54);
    return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
  }
  return `${Math.round(cm)} cm`;
}
export function formatWeight(kg: number, units: Units): string {
  return units === "imperial"
    ? `${Math.round(kg * 2.20462)} lb`
    : `${Math.round(kg * 10) / 10} kg`;
}

/* ---------- aggregation ---------- */

export function sum(entries: Nutrition[]): Nutrition {
  const t = { ...EMPTY_NUTRITION };
  for (const e of entries) {
    t.calories += e.calories;
    t.protein += e.protein;
    t.carbs += e.carbs;
    t.fat += e.fat;
    t.fiber += e.fiber;
    t.sugar += e.sugar;
    t.sodium += e.sodium;
  }
  return t;
}
export function byDay(entries: Entry[]): Map<string, Entry[]> {
  const m = new Map<string, Entry[]>();
  for (const e of entries) {
    const arr = m.get(e.logDate);
    if (arr) arr.push(e);
    else m.set(e.logDate, [e]);
  }
  return m;
}
export function groupByMeal(entries: Entry[]): { meal: Meal; items: Entry[]; kcal: number }[] {
  const order: Meal[] = ["breakfast", "lunch", "snacks", "drinks", "dinner"];
  return order
    .map((meal) => {
      const items = entries
        .filter((e) => e.meal === meal)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
      return { meal, items, kcal: items.reduce((s, e) => s + e.calories, 0) };
    })
    .filter((g) => g.items.length > 0);
}

/* ---------- misc ---------- */

export function defaultMeal(d = new Date()): Meal {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snacks";
  return "dinner";
}
export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
export function kcal(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
export function emptyDraft(meal: Meal = defaultMeal()): FoodDraft {
  return { name: "", serving: "1 serving", meal, ...EMPTY_NUTRITION };
}
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function goalLabel(g: Goal): string {
  return g === "lose" ? "Lose weight" : g === "gain" ? "Gain weight" : "Maintain weight";
}

/* ---------- streaks ---------- */

export interface StreakInfo {
  /** consecutive logged days ending today (or yesterday, so today isn't a broken streak yet) */
  current: number;
  best: number;
  /** true when today already has at least one entry */
  loggedToday: boolean;
  /** last 7 days, oldest first, ending today */
  week: { key: string; label: string; logged: boolean; isToday: boolean }[];
  totalDays: number;
}

export function streakInfo(entries: Pick<Entry, "logDate">[], now = new Date()): StreakInfo {
  const days = new Set(entries.map((e) => e.logDate));
  const today = toKey(now);
  const loggedToday = days.has(today);
  let cursor = loggedToday ? now : addDays(now, -1);
  let current = 0;
  while (days.has(toKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = fromKey(k);
    run = prev && toKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    const key = toKey(d);
    return {
      key,
      label: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      logged: days.has(key),
      isToday: key === today,
    };
  });
  return { current, best, loggedToday, week, totalDays: days.size };
}

/** Normalises a food name so "Dal tadka" and "dal  tadka " match. */
export function foodKey(name: string, serving: string): string {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${n(name)}|${n(serving)}`;
}
