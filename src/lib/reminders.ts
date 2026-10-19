/* Meal reminders. Stored on this device only.
 *
 * What they do today: while Go Calories is open, Today shows a gentle nudge once a meal's
 * reminder time has passed and nothing is logged for that meal. Phone notifications need the
 * installed app plus a push service, which isn't built yet — the Streaks screen says so.
 */
import type { Entry, Meal } from "./types";
import { MEAL_LABEL } from "./types";
import { toKey } from "./nutrition";

export type ReminderMeal = Extract<Meal, "breakfast" | "lunch" | "dinner">;
export const REMINDER_MEALS: ReminderMeal[] = ["breakfast", "lunch", "dinner"];

export interface Reminder {
  on: boolean;
  time: string; // "HH:MM" 24h
}
export type Reminders = Record<ReminderMeal, Reminder>;

export const DEFAULT_REMINDERS: Reminders = {
  breakfast: { on: false, time: "08:30" },
  lunch: { on: false, time: "13:30" },
  dinner: { on: false, time: "20:00" },
};

const KEY = "gc:reminders";
const DISMISS = "gc:reminder-dismissed";

export function loadReminders(): Reminders {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<Reminders>;
      const out = { ...DEFAULT_REMINDERS };
      for (const m of REMINDER_MEALS) {
        const r = o[m];
        if (r && typeof r.on === "boolean" && /^\d{2}:\d{2}$/.test(r.time)) out[m] = { on: r.on, time: r.time };
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_REMINDERS };
}
export function saveReminders(r: Reminders): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dismissed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS) ?? "null") as { day: string; meals: string[] } | null;
    return raw && raw.day === toKey(new Date()) ? raw.meals : [];
  } catch {
    return [];
  }
}
export function dismissReminder(meal: ReminderMeal): void {
  try {
    localStorage.setItem(DISMISS, JSON.stringify({ day: toKey(new Date()), meals: [...dismissed(), meal] }));
  } catch {
    /* ignore */
  }
}

/** The first reminder that is due: its time has passed (but by less than 5 hours), nothing is logged for that meal, and it wasn't dismissed. */
export function dueReminder(todayEntries: Pick<Entry, "meal">[], r: Reminders, now = new Date()): { meal: ReminderMeal; label: string } | null {
  const skip = dismissed();
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const meal of REMINDER_MEALS) {
    const rem = r[meal];
    if (!rem.on || skip.includes(meal)) continue;
    const [h, m] = rem.time.split(":").map(Number);
    const at = (h || 0) * 60 + (m || 0);
    if (minutes >= at && minutes < at + 300 && !todayEntries.some((e) => e.meal === meal)) {
      return { meal, label: MEAL_LABEL[meal] };
    }
  }
  return null;
}
