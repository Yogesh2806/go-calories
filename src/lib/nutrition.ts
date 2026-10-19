import type {
  Activity,
  Entry,
  FoodDraft,
  Goal,
  MacroSplit,
  Meal,
  Nutrition,
  Profile,
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
/** Mifflin–St Jeor, using the midpoint of the male/female constants
 *  (the sign-up flow doesn't ask for sex). */
export function bmr(heightCm: number, weightKg: number, age: number): number {
  if (!heightCm || !weightKg || !age) return 0;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 78);
}
const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};
export function dailyCalorieGoal(
  p: Pick<Profile, "heightCm" | "weightKg" | "age" | "activity" | "goal">,
): number {
  const base = bmr(p.heightCm, p.weightKg, p.age) * ACTIVITY_FACTOR[p.activity];
  const adj = p.goal === "lose" ? -500 : p.goal === "gain" ? 300 : 0;
  const v = Math.round((base + adj) / 10) * 10;
  return Math.max(1200, v || 2000);
}
export const DEFAULT_SPLIT: MacroSplit = { protein: 40, carbs: 30, fat: 30 };

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}
export function goalsFor(p: Pick<Profile, "calorieGoal" | "split">): Goals {
  return {
    calories: p.calorieGoal,
    protein: Math.round((p.calorieGoal * p.split.protein) / 100 / 4),
    carbs: Math.round((p.calorieGoal * p.split.carbs) / 100 / 4),
    fat: Math.round((p.calorieGoal * p.split.fat) / 100 / 9),
    fiber: Math.max(20, Math.round((p.calorieGoal / 1000) * 14)),
    sugar: 50,
    sodium: 2300,
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
