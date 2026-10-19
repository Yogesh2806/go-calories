import { MEALS, type Meal } from "./types";

/** One parsed food item as returned by the AI (cloud or on-device). */
export interface ParsedItem {
  name: string;
  serving: string;
  meal: Meal | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  /** One short line on how the calories were worked out ("97 kcal per 100 g × 140 g"). May be empty. */
  basis: string;
}

export const DESCRIBE_SYSTEM = `You are the nutrition engine inside a calorie-tracking app.
The user describes what they ate in plain English (often Indian home food, restaurant food, or packaged items).
Split the description into separate food items and estimate realistic nutrition for the portion described.

Rules:
- One entry per distinct food or drink ("2 rotis and a bowl of dal" -> two entries: rotis, dal).
- "serving" is a short human description of the portion, e.g. "2 medium (~80 g)" or "1 bowl (~200 g)".
- If the user gives a quantity, use it. Otherwise assume one typical serving.
- calories in kcal; protein, carbs, fat, fiber, sugar in grams; sodium in milligrams. Use plain numbers, never ranges.
- "meal" is one of: breakfast, lunch, snacks, drinks, dinner — only if the text implies it (e.g. "coffee" is drinks); otherwise omit it.
- Be realistic, not optimistic. Prefer common reference values (IFCT / USDA) over guesses.
- "basis" is one short plain sentence showing how the calories were worked out, e.g. "About 97 kcal per 100 g × 140 g, plus roughly 1 tbsp ghee (44 kcal)". Keep it under 140 characters.
- Respond with JSON only, matching exactly: {"items":[{"name":string,"serving":string,"meal":string?,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number,"sodium_mg":number,"basis":string}]}`;

function n(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) && x > 0 ? Math.round(x * 10) / 10 : 0;
}

/** Pulls the first JSON object/array out of a model reply (handles ```json fences and chatter). */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    /* fall through */
  }
  const start = t.search(/[{[]/);
  if (start === -1) throw new Error("The AI reply wasn't valid JSON.");
  const open = t[start];
  const close = open === "{" ? "}" : "]";
  const end = t.lastIndexOf(close);
  if (end <= start) throw new Error("The AI reply wasn't valid JSON.");
  return JSON.parse(t.slice(start, end + 1));
}

export function normalizeItems(raw: unknown): ParsedItem[] {
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? ((raw as { items: unknown[] }).items as unknown[])
      : [];
  const out: ParsedItem[] = [];
  for (const it of arr.slice(0, 12)) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    const meal = String(o.meal ?? "").toLowerCase() as Meal;
    out.push({
      name: name.slice(0, 120),
      serving: String(o.serving ?? "1 serving").trim().slice(0, 80) || "1 serving",
      meal: MEALS.includes(meal) ? meal : null,
      calories: n(o.calories ?? o.kcal),
      protein: n(o.protein_g ?? o.protein),
      carbs: n(o.carbs_g ?? o.carbs ?? o.carbohydrates_g),
      fat: n(o.fat_g ?? o.fat),
      fiber: n(o.fiber_g ?? o.fiber),
      sugar: n(o.sugar_g ?? o.sugar),
      sodium: n(o.sodium_mg ?? o.sodium),
      basis: String(o.basis ?? "").trim().slice(0, 240),
    });
  }
  return out;
}
