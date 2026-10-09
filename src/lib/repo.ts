import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry, Meal, Preset, Profile, Source } from "./types";
import { MEALS } from "./types";
import { DEFAULT_SPLIT } from "./nutrition";

export interface Snapshot {
  profile: Profile | null;
  entries: Entry[];
  presets: Preset[];
}

export interface Repo {
  load(): Promise<Snapshot>;
  saveProfile(p: Profile): Promise<void>;
  addEntries(es: Entry[]): Promise<void>;
  updateEntry(e: Entry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  addPreset(p: Preset): Promise<void>;
  deletePreset(id: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Local (device-only) repo                                           */
/* ------------------------------------------------------------------ */

export function localRepo(userId: string): Repo {
  const key = `gc:v1:${userId}`;
  const read = (): Snapshot => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as Snapshot;
    } catch {
      /* ignore */
    }
    return { profile: null, entries: [], presets: [] };
  };
  const write = (s: Snapshot) => {
    try {
      localStorage.setItem(key, JSON.stringify(s));
    } catch {
      /* storage full / blocked */
    }
  };
  return {
    async load() {
      return read();
    },
    async saveProfile(p) {
      const s = read();
      s.profile = p;
      write(s);
    },
    async addEntries(es) {
      const s = read();
      s.entries.push(...es);
      write(s);
    },
    async updateEntry(e) {
      const s = read();
      s.entries = s.entries.map((x) => (x.id === e.id ? e : x));
      write(s);
    },
    async deleteEntry(id) {
      const s = read();
      s.entries = s.entries.filter((x) => x.id !== id);
      write(s);
    },
    async addPreset(p) {
      const s = read();
      s.presets.unshift(p);
      write(s);
    },
    async deletePreset(id) {
      const s = read();
      s.presets = s.presets.filter((x) => x.id !== id);
      write(s);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Supabase repo                                                      */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function entryFromRow(r: Row): Entry {
  return {
    id: r.id,
    logDate: String(r.log_date),
    loggedAt: r.logged_at,
    meal: (MEALS.includes(r.meal) ? r.meal : "snacks") as Meal,
    name: r.name,
    serving: r.serving ?? "",
    calories: n(r.calories),
    protein: n(r.protein_g),
    carbs: n(r.carbs_g),
    fat: n(r.fat_g),
    fiber: n(r.fiber_g),
    sugar: n(r.sugar_g),
    sodium: n(r.sodium_mg),
    source: (r.source ?? "manual") as Source,
  };
}
function entryToRow(e: Entry, userId: string): Row {
  return {
    id: e.id,
    user_id: userId,
    log_date: e.logDate,
    logged_at: e.loggedAt,
    meal: e.meal,
    name: e.name,
    serving: e.serving,
    calories: e.calories,
    protein_g: e.protein,
    carbs_g: e.carbs,
    fat_g: e.fat,
    fiber_g: e.fiber,
    sugar_g: e.sugar,
    sodium_mg: e.sodium,
    source: e.source,
  };
}
function presetFromRow(r: Row): Preset {
  return {
    id: r.id,
    name: r.name,
    serving: r.serving ?? "",
    calories: n(r.calories),
    protein: n(r.protein_g),
    carbs: n(r.carbs_g),
    fat: n(r.fat_g),
    fiber: n(r.fiber_g),
    sugar: n(r.sugar_g),
    sodium: n(r.sodium_mg),
  };
}
function presetToRow(p: Preset, userId: string): Row {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    serving: p.serving,
    calories: p.calories,
    protein_g: p.protein,
    carbs_g: p.carbs,
    fat_g: p.fat,
    fiber_g: p.fiber,
    sugar_g: p.sugar,
    sodium_mg: p.sodium,
  };
}
function profileFromRow(r: Row): Profile {
  return {
    name: r.name ?? "",
    heightCm: n(r.height_cm),
    weightKg: n(r.weight_kg),
    age: n(r.age),
    goal: r.goal ?? "maintain",
    targetWeightKg: n(r.target_weight_kg),
    activity: r.activity ?? "light",
    calorieGoal: n(r.calorie_goal) || 2000,
    split: {
      protein: n(r.split_protein) || DEFAULT_SPLIT.protein,
      carbs: n(r.split_carbs) || DEFAULT_SPLIT.carbs,
      fat: n(r.split_fat) || DEFAULT_SPLIT.fat,
    },
    units: r.units ?? "metric",
    accent: r.accent ?? "graphite",
    theme: r.theme ?? "system",
    aiMode: r.ai_mode ?? "cloud",
    onboarded: Boolean(r.onboarded),
  };
}
function profileToRow(p: Profile, userId: string): Row {
  return {
    id: userId,
    name: p.name,
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    age: p.age,
    goal: p.goal,
    target_weight_kg: p.targetWeightKg,
    activity: p.activity,
    calorie_goal: p.calorieGoal,
    split_protein: p.split.protein,
    split_carbs: p.split.carbs,
    split_fat: p.split.fat,
    units: p.units,
    accent: p.accent,
    theme: p.theme,
    ai_mode: p.aiMode,
    onboarded: p.onboarded,
    updated_at: new Date().toISOString(),
  };
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function supabaseRepo(sb: SupabaseClient, userId: string): Repo {
  return {
    async load() {
      const [p, e, pr] = await Promise.all([
        sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
        sb
          .from("food_entries")
          .select("*")
          .order("logged_at", { ascending: true })
          .limit(5000),
        sb.from("presets").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      const prof = check<Row | null>(p as never);
      const ents = check<Row[]>(e as never) ?? [];
      const pres = check<Row[]>(pr as never) ?? [];
      return {
        profile: prof ? profileFromRow(prof) : null,
        entries: ents.map(entryFromRow),
        presets: pres.map(presetFromRow),
      };
    },
    async saveProfile(p) {
      check((await sb.from("profiles").upsert(profileToRow(p, userId))) as never);
    },
    async addEntries(es) {
      check((await sb.from("food_entries").insert(es.map((e) => entryToRow(e, userId)))) as never);
    },
    async updateEntry(e) {
      check((await sb.from("food_entries").update(entryToRow(e, userId)).eq("id", e.id)) as never);
    },
    async deleteEntry(id) {
      check((await sb.from("food_entries").delete().eq("id", id)) as never);
    },
    async addPreset(p) {
      check((await sb.from("presets").insert(presetToRow(p, userId))) as never);
    },
    async deletePreset(id) {
      check((await sb.from("presets").delete().eq("id", id)) as never);
    },
  };
}
