"use client";

import { useEffect, type ReactNode } from "react";
import Icon, { MEAL_ICON } from "./Icon";
import { MEALS, MEAL_LABEL, type FoodDraft, type Meal, type Nutrition } from "@/lib/types";
import { num } from "@/lib/nutrition";

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? " on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{title}</h2>
          <button type="button" className="iconbtn" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function NumInput({
  value,
  onChange,
  placeholder = "0",
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      className="input"
      type="number"
      inputMode="decimal"
      min="0"
      step={step ?? "any"}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="scroll-x" role="radiogroup" aria-label="Meal">
      {MEALS.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          className={`chip${value === m ? " on" : ""}`}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => onChange(m)}
        >
          <Icon name={MEAL_ICON[m]} size={15} />
          {MEAL_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

/* ---------- editable food item (string-backed so typing feels natural) ---------- */

export interface Draft {
  name: string;
  serving: string;
  meal: Meal;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

const s = (n: number): string => (n ? String(Math.round(n * 10) / 10) : "");

export function toDraft(f: FoodDraft): Draft {
  return {
    name: f.name,
    serving: f.serving,
    meal: f.meal,
    calories: s(f.calories),
    protein: s(f.protein),
    carbs: s(f.carbs),
    fat: s(f.fat),
    fiber: s(f.fiber),
    sugar: s(f.sugar),
    sodium: s(f.sodium),
  };
}
export function fromDraft(d: Draft): FoodDraft {
  return {
    name: d.name.trim(),
    serving: d.serving.trim() || "1 serving",
    meal: d.meal,
    calories: num(d.calories),
    protein: num(d.protein),
    carbs: num(d.carbs),
    fat: num(d.fat),
    fiber: num(d.fiber),
    sugar: num(d.sugar),
    sodium: num(d.sodium),
  };
}
export function nutritionOf(d: Draft): Nutrition {
  const f = fromDraft(d);
  return {
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber,
    sugar: f.sugar,
    sodium: f.sodium,
  };
}
export function draftValid(d: Draft): boolean {
  return d.name.trim().length > 0 && num(d.calories) > 0;
}

export function ItemEditor({
  draft,
  onChange,
  showMeal = true,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  showMeal?: boolean;
}) {
  const set = (k: keyof Draft) => (v: string) => onChange({ ...draft, [k]: v });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {showMeal && <MealPicker value={draft.meal} onChange={(m) => onChange({ ...draft, meal: m })} />}
      <Field label="NAME">
        <input
          className="input"
          value={draft.name}
          placeholder="e.g. Masala oats"
          onChange={(e) => set("name")(e.target.value)}
          autoCapitalize="sentences"
        />
      </Field>
      <Field label="SERVING">
        <input
          className="input"
          value={draft.serving}
          placeholder="1 bowl (~200 g)"
          onChange={(e) => set("serving")(e.target.value)}
        />
      </Field>
      <div className="grid2">
        <Field label="KCAL">
          <NumInput value={draft.calories} onChange={set("calories")} />
        </Field>
        <Field label="PROTEIN G">
          <NumInput value={draft.protein} onChange={set("protein")} />
        </Field>
        <Field label="CARBS G">
          <NumInput value={draft.carbs} onChange={set("carbs")} />
        </Field>
        <Field label="FAT G">
          <NumInput value={draft.fat} onChange={set("fat")} />
        </Field>
      </div>
      <div className="label" style={{ marginTop: 2 }}>
        Micros (optional)
      </div>
      <div className="grid3">
        <Field label="FIBER G">
          <NumInput value={draft.fiber} onChange={set("fiber")} />
        </Field>
        <Field label="SUGAR G">
          <NumInput value={draft.sugar} onChange={set("sugar")} />
        </Field>
        <Field label="SODIUM MG">
          <NumInput value={draft.sodium} onChange={set("sodium")} />
        </Field>
      </div>
    </div>
  );
}
