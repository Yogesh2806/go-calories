"use client";

import type { Goals } from "@/lib/nutrition";
import { kcal } from "@/lib/nutrition";
import type { Nutrition, UiStyle } from "@/lib/types";

function MacroMini({ label, v, g, color }: { label: string; v: number; g: number; color: string }) {
  const pct = Math.min(100, Math.round((v / Math.max(1, g)) * 100));
  return (
    <div className="macro-mini">
      <div className="top">
        <span>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(v)} / {g} g
        </span>
      </div>
      <div className="tr">
        <i style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** Calories-left goal bar: a flat number + bar in Paper, a ring in a glass card in Mono Glass. */
export default function GoalBlock({
  style,
  totals,
  goals,
}: {
  style: UiStyle;
  totals: Nutrition;
  goals: Goals;
}) {
  const left = goals.calories - totals.calories;
  const pct = Math.min(100, Math.round((totals.calories / goals.calories) * 100));
  const macros = (
    <>
      <MacroMini label="Protein" v={totals.protein} g={goals.protein} color="var(--c-protein)" />
      <MacroMini label="Carbs" v={totals.carbs} g={goals.carbs} color="var(--c-carbs)" />
      <MacroMini label="Fat" v={totals.fat} g={goals.fat} color="var(--c-fat)" />
    </>
  );
  const leftText = left >= 0 ? `${kcal(left)} left` : `${kcal(-left)} over`;

  if (style === "paper") {
    return (
      <div aria-label="Today's calories">
        <div className="goal-numbers">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="goal-big">{kcal(totals.calories)}</span>
            <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>of {kcal(goals.calories)} kcal</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: left < 0 ? "var(--danger)" : "var(--accent-text)" }}>{leftText}</span>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <i style={{ width: `${pct}%`, background: left < 0 ? "var(--danger)" : undefined }} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>{macros}</div>
      </div>
    );
  }

  const circ = 251.3;
  const off = Math.round(circ * (1 - Math.min(1, totals.calories / goals.calories)) * 10) / 10;
  return (
    <div className="card" style={{ padding: "16px 18px", borderRadius: 28 }} aria-label="Today's calories">
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
          <svg width="104" height="104" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--track)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={left < 0 ? "var(--danger)" : "var(--ink)"}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={off}
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {kcal(Math.abs(left))}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>kcal {left < 0 ? "over" : "left"}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            <b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{kcal(totals.calories)}</b> of {kcal(goals.calories)} kcal
          </div>
          {macros}
        </div>
      </div>
    </div>
  );
}
