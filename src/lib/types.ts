export type Meal = "breakfast" | "lunch" | "snacks" | "drinks" | "dinner";
export const MEALS: Meal[] = ["breakfast", "lunch", "snacks", "drinks", "dinner"];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  drinks: "Drinks",
  dinner: "Dinner",
};

export type Goal = "lose" | "maintain" | "gain";
export type Activity = "sedentary" | "light" | "moderate" | "active";
export type Units = "metric" | "imperial";
export type ThemePref = "light" | "dark" | "system";
export type AiMode = "cloud" | "chrome" | "device";
export type Source = "manual" | "barcode" | "describe" | "preset";

export const ACCENT_KEYS = [
  "graphite",
  "blue",
  "teal",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface FoodDraft extends Nutrition {
  name: string;
  serving: string;
  meal: Meal;
}

export interface Entry extends FoodDraft {
  id: string;
  logDate: string; // YYYY-MM-DD (local)
  loggedAt: string; // ISO timestamp
  source: Source;
}

export interface Preset extends Nutrition {
  id: string;
  name: string;
  serving: string;
}

export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  name: string;
  heightCm: number;
  weightKg: number;
  age: number;
  goal: Goal;
  targetWeightKg: number;
  activity: Activity;
  calorieGoal: number;
  split: MacroSplit; // percentages, sum to 100
  units: Units;
  accent: AccentKey;
  theme: ThemePref;
  aiMode: AiMode;
  onboarded: boolean;
}

export const EMPTY_NUTRITION: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};
