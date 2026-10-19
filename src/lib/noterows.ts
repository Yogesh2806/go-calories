/* One line of the note while it is being read: what the AI found, scaled by the person's portion tweak. */
import type { ParsedItem } from "./describe";
import type { Meal, Nutrition, Preset } from "./types";

export interface Row {
  id: string;
  key: string;
  name: string;
  serving: string;
  /** the meal this line belongs to (named in the note, hinted by the AI, or picked from the time of day) */
  meal: Meal;
  /** nutrition for one serving as the AI (or a saved meal) gave it */
  base: Nutrition;
  basis: string;
  factor: number;
  locked: boolean;
  fromPreset: boolean;
}

export const NUTRIENTS: (keyof Nutrition)[] = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"];

export const scaled = (r: Row): Nutrition =>
  Object.fromEntries(NUTRIENTS.map((k) => [k, Math.round(r.base[k] * r.factor * 10) / 10])) as unknown as Nutrition;

export const servingOf = (r: Row): string =>
  r.factor === 1 ? r.serving : `${Math.round(r.factor * 100) / 100} × ${r.serving}`;

export function nutritionOf(p: ParsedItem | Preset): Nutrition {
  return { calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat, fiber: p.fiber, sugar: p.sugar, sodium: p.sodium };
}
