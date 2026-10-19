"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app";
import { goalsFor, makePlan } from "@/lib/nutrition";
import type { Sex } from "@/lib/types";

const KEY = "gc:sex-prompt-dismissed";

/** One-time card for accounts made before we asked for sex: the formula needs it, and the targets change when it is added. */
export default function SexPrompt() {
  const app = useApp();
  const p = app.profile;
  const [hidden, setHidden] = useState(true);
  const [sex, setSex] = useState<Sex>("male");
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (!p || p.sex || !p.onboarded || hidden) return null;

  const plan = makePlan({ ...p, sex });
  const next = goalsFor({ ...p, calorieGoal: plan.calories, proteinPerKg: plan.proteinPerKg, fatPct: plan.fatPct });
  const same = plan.calories === p.calorieGoal;

  return (
    <div className="card sm" role="region" aria-label="Update your targets" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Targets got more accurate</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.45 }}>
          Calories now use your sex, and protein is set per kg of body weight instead of a fixed share of calories. Pick yours to refresh your targets.
        </div>
      </div>
      <div className="seg" role="radiogroup" aria-label="Sex">
        {(["male", "female"] as Sex[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={sex === s} className={sex === s ? "on" : ""} onClick={() => setSex(s)}>
            {s === "male" ? "Male" : "Female"}
          </button>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        You would get <b style={{ color: "var(--ink)" }}>{next.calories.toLocaleString()} kcal</b>, protein {next.protein} g, carbs {next.carbs} g, fat {next.fat} g
        {same ? "" : ` (now ${p.calorieGoal.toLocaleString()} kcal)`}.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="btn"
          style={{ minHeight: 44, fontSize: 15 }}
          onClick={() => void app.saveProfile({ sex, calorieGoal: plan.calories, proteinPerKg: plan.proteinPerKg, fatPct: plan.fatPct })}
        >
          Update my targets
        </button>
        <button
          type="button"
          className="btn ghost"
          style={{ minHeight: 44, fontSize: 15, width: "auto" }}
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
