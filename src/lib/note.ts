/* Helpers for the "write it like a note" flow: finding the meal words in free text, and
 * turning a logged entry back into a natural phrase. */
import type { Entry, Meal } from "./types";

export interface NoteSegment {
  /** the meal the person named ("For lunch…"), or null when they didn't name one */
  meal: Meal | null;
  text: string;
}

const WORD_TO_MEAL: Record<string, Meal> = {
  breakfast: "breakfast",
  brunch: "breakfast",
  lunch: "lunch",
  snack: "snacks",
  snacks: "snacks",
  dinner: "dinner",
  supper: "dinner",
  drink: "drinks",
  drinks: "drinks",
};

/** A meal word at the start of a line or sentence: "For breakfast", "Lunch:", "dinner -". */
const MARKER =
  /(?:^|\n|(?<=[.!;]\s))[ \t]*(?:(?:for|at|during|as)\s+(?:my\s+|the\s+)?)?(breakfast|brunch|lunch|snacks?|dinner|supper|drinks?)\b[ \t]*[:,\-–—]?[ \t]*/gi;

/** Splits a note at its meal words. Text before the first meal word gets `meal: null`. */
export function splitMeals(text: string): NoteSegment[] {
  const marks: { at: number; end: number; meal: Meal }[] = [];
  for (const m of text.matchAll(MARKER)) {
    const meal = WORD_TO_MEAL[m[1].toLowerCase()];
    if (meal && m.index !== undefined) marks.push({ at: m.index, end: m.index + m[0].length, meal });
  }
  const out: NoteSegment[] = [];
  const head = (marks.length ? text.slice(0, marks[0].at) : text).trim();
  if (head) out.push({ meal: null, text: head });
  marks.forEach((m, i) => {
    const body = text.slice(m.end, i + 1 < marks.length ? marks[i + 1].at : undefined).trim();
    if (body) out.push({ meal: m.meal, text: body });
  });
  return out;
}

/** "75 g" / "2 medium (~80 g)" → the short quantity people actually write, or "" when it isn't a short one. */
export function shortQty(serving: string): string {
  const s = serving.replace(/\(.*?\)/g, "").replace(/~/g, "").trim();
  if (!s || s.length > 16) return "";
  if (/^(1 )?serving$/i.test(s)) return "";
  return s;
}

/** How a logged item reads in the note: "75 g mixed oats", "2 medium dosa", "banana". */
export function inlineText(e: Pick<Entry, "name" | "serving">): { qty: string; name: string } {
  const qty = shortQty(e.serving);
  // some names already carry their quantity ("75g mixed oats")
  if (qty && /^\d/.test(e.name.trim())) return { qty: "", name: e.name };
  return { qty, name: e.name };
}
