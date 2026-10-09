"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app";
import { Splash } from "@/components/Shell";
import { Field, NumInput } from "@/components/ui";
import Icon from "@/components/Icon";
import {
  DEFAULT_SPLIT,
  bmi,
  bmiCategory,
  bmr,
  dailyCalorieGoal,
  goalsFor,
  num,
} from "@/lib/nutrition";
import type { Activity, Goal } from "@/lib/types";

const GOALS: { key: Goal; label: string; hint: string }[] = [
  { key: "lose", label: "Lose weight", hint: "A steady deficit" },
  { key: "maintain", label: "Maintain weight", hint: "Stay where you are" },
  { key: "gain", label: "Gain weight", hint: "A gentle surplus" },
];
const ACTIVITIES: { key: Activity; label: string }[] = [
  { key: "sedentary", label: "Sedentary" },
  { key: "light", label: "Light" },
  { key: "moderate", label: "Moderate" },
  { key: "active", label: "Active" },
];

export default function Onboarding() {
  const app = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const [age, setAge] = useState("28");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [target, setTarget] = useState("70");
  const [activity, setActivity] = useState<Activity>("light");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (app.status === "out") router.replace("/login");
  }, [app.status, router]);

  // Seed the form once from whatever profile we loaded (name from Google, etc).
  useEffect(() => {
    if (seeded || !app.ready || !app.profile) return;
    const p = app.profile;
    setName(p.name);
    setHeight(String(p.heightCm));
    setWeight(String(p.weightKg));
    setAge(String(p.age));
    setGoal(p.goal);
    setTarget(String(p.targetWeightKg));
    setActivity(p.activity);
    setSeeded(true);
  }, [app.ready, app.profile, seeded]);

  if (app.status !== "in" || !app.ready) return <Splash />;

  const h = num(height);
  const w = num(weight);
  const a = num(age);
  const bm = bmi(h, w);
  const calories = dailyCalorieGoal({ heightCm: h, weightKg: w, age: a, activity, goal });
  const goals = goalsFor({ calorieGoal: calories, split: DEFAULT_SPLIT });
  const step1Ok = h >= 100 && h <= 250 && w >= 25 && w <= 350 && a >= 10 && a <= 110;
  const step2Ok = goal === "maintain" || num(target) >= 25;

  async function finish() {
    await app.saveProfile({
      name: name.trim() || app.user?.name || "there",
      heightCm: h,
      weightKg: w,
      age: a,
      goal,
      targetWeightKg: goal === "maintain" ? w : num(target),
      activity,
      calorieGoal: calories,
      split: DEFAULT_SPLIT,
      onboarded: true,
    });
    router.replace("/");
  }

  const bmiPos = Math.min(100, Math.max(0, ((bm - 15) / 20) * 100));

  return (
    <div className="scr">
      <div className="blob" />
      <div className="page narrow tight" style={{ minHeight: "100dvh", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {step > 0 ? (
              <button type="button" className="iconbtn" aria-label="Back" onClick={() => setStep(step - 1)}>
                <Icon name="chevL" size={20} />
              </button>
            ) : (
              <span style={{ width: 36 }} />
            )}
            <div style={{ display: "flex", gap: 6 }} aria-label={`Step ${step + 1} of 3`}>
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  style={{
                    width: i === step ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === step ? "var(--ink)" : "var(--fill-2)",
                    transition: "width .2s",
                  }}
                />
              ))}
            </div>
            <span style={{ width: 36 }} />
          </div>

          {step === 0 && (
            <>
              <header>
                <h1 className="h1" style={{ fontSize: 30 }}>
                  Let&apos;s get to know you
                </h1>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45 }}>
                  This helps us set daily targets that actually fit you.
                </p>
              </header>
              <Field label="NAME">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  autoComplete="given-name"
                />
              </Field>
              <div className="grid3">
                <Field label="HEIGHT (CM)">
                  <NumInput value={height} onChange={setHeight} placeholder="170" />
                </Field>
                <Field label="WEIGHT (KG)">
                  <NumInput value={weight} onChange={setWeight} placeholder="70" />
                </Field>
                <Field label="AGE (YRS)">
                  <NumInput value={age} onChange={setAge} placeholder="28" step="1" />
                </Field>
              </div>
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="label">BMI range</span>
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                    {bm ? bm.toFixed(1) : "—"} · {bmiCategory(bm)}
                  </span>
                </div>
                <div style={{ position: "relative", height: 10, borderRadius: 5, overflow: "hidden", display: "flex" }}>
                  <i style={{ flex: 3.5, background: "var(--track)" }} />
                  <i style={{ flex: 6.5, background: "var(--c-fiber)", opacity: 0.55 }} />
                  <i style={{ flex: 5, background: "var(--c-carbs)", opacity: 0.55 }} />
                  <i style={{ flex: 5, background: "var(--c-protein)", opacity: 0.55 }} />
                </div>
                <div style={{ position: "relative", height: 0 }}>
                  <i
                    style={{
                      position: "absolute",
                      left: `${bmiPos}%`,
                      top: -22,
                      width: 4,
                      height: 14,
                      borderRadius: 2,
                      background: "var(--ink)",
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
                <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span>15</span>
                  <span>25</span>
                  <span>35</span>
                </div>
              </div>
              <div className="grid2">
                <div className="card sm">
                  <div className="label" style={{ fontSize: 11 }}>BMI</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{bm ? bm.toFixed(1) : "—"}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
                    Body Mass Index — your weight relative to your height.
                  </div>
                </div>
                <div className="card sm">
                  <div className="label" style={{ fontSize: 11 }}>BMR</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                    {bmr(h, w, a) ? bmr(h, w, a).toLocaleString() : "—"}{" "}
                    <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>kcal/day</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
                    Basal Metabolic Rate — calories you burn at rest.
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <header>
                <h1 className="h1" style={{ fontSize: 30 }}>
                  What&apos;s your goal?
                </h1>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45 }}>
                  Pick what you&apos;re working toward — you can change this anytime.
                </p>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="radiogroup" aria-label="Goal">
                {GOALS.map((g) => {
                  const on = goal === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setGoal(g.key)}
                      className="card"
                      style={{
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 18px",
                        borderRadius: 20,
                        background: on ? "var(--ink)" : undefined,
                        color: on ? "var(--ink-contrast)" : undefined,
                        boxShadow: "none",
                      }}
                    >
                      <span>
                        <span style={{ display: "block", fontSize: 16, fontWeight: 600 }}>{g.label}</span>
                        <span style={{ display: "block", fontSize: 12.5, opacity: 0.7, marginTop: 2 }}>{g.hint}</span>
                      </span>
                      {on && <Icon name="check" size={20} />}
                    </button>
                  );
                })}
              </div>
              {goal !== "maintain" && (
                <Field label="TARGET WEIGHT (KG)">
                  <NumInput value={target} onChange={setTarget} placeholder="68" />
                </Field>
              )}
              <div>
                <div className="label" style={{ marginBottom: 10 }}>Activity level</div>
                <div className="seg" role="radiogroup" aria-label="Activity level">
                  {ACTIVITIES.map((x) => (
                    <button
                      key={x.key}
                      type="button"
                      role="radio"
                      aria-checked={activity === x.key}
                      className={activity === x.key ? "on" : ""}
                      onClick={() => setActivity(x.key)}
                      style={{ fontSize: 12.5 }}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <header>
                <h1 className="h1" style={{ fontSize: 30 }}>
                  Here&apos;s your plan
                </h1>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45 }}>
                  Based on what you told us. Fine-tune it anytime from Profile.
                </p>
              </header>
              <div className="card" style={{ textAlign: "center", padding: "28px 22px" }}>
                <div className="label">Daily calorie goal</div>
                <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>
                  {calories.toLocaleString()}
                </div>
                <div className="muted" style={{ fontSize: 14 }}>kcal / day</div>
              </div>
              <div className="grid3">
                {[
                  { label: "Protein", g: goals.protein, pct: DEFAULT_SPLIT.protein, c: "var(--c-protein)" },
                  { label: "Carbs", g: goals.carbs, pct: DEFAULT_SPLIT.carbs, c: "var(--c-carbs)" },
                  { label: "Fat", g: goals.fat, pct: DEFAULT_SPLIT.fat, c: "var(--c-fat)" },
                ].map((m) => (
                  <div key={m.label} className="card sm" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{m.g}g</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                      <i style={{ width: 7, height: 7, borderRadius: 4, background: m.c }} />
                      {m.label} · {m.pct}%
                    </div>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, textAlign: "center" }}>
                {goal === "maintain"
                  ? "Maintain weight"
                  : `${goal === "lose" ? "Lose" : "Gain"} weight → ${num(target)} kg`}
                , at a {ACTIVITIES.find((x) => x.key === activity)?.label} activity level
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn"
          disabled={(step === 0 && !step1Ok) || (step === 1 && !step2Ok)}
          onClick={() => (step < 2 ? setStep(step + 1) : finish())}
        >
          {step < 2 ? "Continue" : "Get Started"}
        </button>
      </div>
    </div>
  );
}
