"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app";
import { Splash } from "@/components/Shell";
import { Field } from "@/components/ui";
import Icon from "@/components/Icon";
import {
  ACTIVITY_FACTOR,
  ACTIVITY_HINT,
  ACTIVITY_LABEL,
  bmi,
  bmiCategory,
  goalsFor,
  macroPercents,
  makePlan,
  num,
} from "@/lib/nutrition";
import type { Activity, Goal, Sex } from "@/lib/types";

const ACTIVITIES: Activity[] = ["sedentary", "light", "moderate", "active"];

function NumField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <span className="input" style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", outline: "none", fontSize: 18, fontWeight: 600, height: 44 }}
        />
        <span className="muted" style={{ fontSize: 13 }}>{unit}</span>
      </span>
    </Field>
  );
}

export default function Onboarding() {
  const app = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex>("male");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");
  const [age, setAge] = useState("28");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [target, setTarget] = useState("70");
  const [activity, setActivity] = useState<Activity>("light");
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (app.status === "out") router.replace("/login");
  }, [app.status, router]);

  // Seed the form once from whatever profile we loaded.
  useEffect(() => {
    if (seeded || !app.ready || !app.profile) return;
    const p = app.profile;
    if (p.sex) setSex(p.sex);
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
  const t = goal === "maintain" ? w : num(target);
  const bm = bmi(h, w);
  const plan = makePlan({ sex, age: a, heightCm: h, weightKg: w, targetWeightKg: t, activity, goal });
  const goals = goalsFor({ calorieGoal: plan.calories, proteinPerKg: plan.proteinPerKg, fatPct: plan.fatPct, weightKg: w, heightCm: h, targetWeightKg: t, goal });
  const pct = macroPercents(goals);
  const diff = Math.abs(w - t);
  const weeks = plan.kgPerWeek > 0 ? Math.max(1, Math.round(diff / plan.kgPerWeek)) : 0;
  const goalOk = goal === "maintain" || (goal === "lose" ? t >= 25 && t < w : t > w && t <= 350);
  const bodyOk = h >= 100 && h <= 250 && w >= 25 && w <= 350 && a >= 10 && a <= 110;
  const bmiPos = Math.min(100, Math.max(0, ((bm - 15) / 20) * 100));
  const lowerBound = goal === "lose" && plan.calories === (sex === "female" ? 1200 : 1500);

  async function finish(then: string) {
    setSaving(true);
    await app.saveProfile({
      name: app.profile?.name || app.user?.name || "there",
      sex,
      heightCm: h,
      weightKg: w,
      age: Math.round(a),
      goal,
      targetWeightKg: t,
      activity,
      calorieGoal: plan.calories,
      proteinPerKg: plan.proteinPerKg,
      fatPct: plan.fatPct,
      onboarded: true,
    });
    router.replace(then);
  }

  const GOALS: { key: Goal; label: string; hint: string; icon: "arrowUp" | "minus" | "plus" }[] = [
    {
      key: "lose",
      label: "Lose weight",
      hint: `A steady deficit, about ${makePlan({ sex, age: a, heightCm: h, weightKg: w, targetWeightKg: t, activity, goal: "lose" }).kgPerWeek.toFixed(2).replace(/0$/, "")} kg a week`,
      icon: "arrowUp",
    },
    { key: "maintain", label: "Maintain weight", hint: "Eat what you burn", icon: "minus" },
    { key: "gain", label: "Gain weight", hint: "A small surplus, about 0.25 kg a week", icon: "plus" },
  ];

  const bar = (
    <div style={{ display: "flex", gap: 6 }} aria-label={`Step ${step + 1} of 3`}>
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, background: i === step ? "var(--ink)" : "var(--track)", transition: "width .2s" }} />
      ))}
    </div>
  );

  return (
    <div className="scr">
      <div className="blob" />
      <div className="page narrow tight" style={{ minHeight: "100dvh", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {step > 0 ? (
              <button type="button" className="iconbtn" aria-label="Back" onClick={() => setStep(step - 1)}>
                <Icon name="chevL" size={20} />
              </button>
            ) : (
              <span style={{ width: 36 }} />
            )}
            {bar}
            <span style={{ width: 36 }} />
          </div>

          {step === 0 && (
            <>
              <header>
                <h1 className="h1" style={{ fontSize: 30 }}>Let&apos;s get to know you</h1>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45 }}>This sets daily targets that actually fit you.</p>
              </header>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>Sex</div>
                <div className="seg" role="radiogroup" aria-label="Sex" style={{ padding: 4 }}>
                  {(["male", "female"] as Sex[]).map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={sex === s} className={sex === s ? "on" : ""} onClick={() => setSex(s)} style={{ padding: "12px 0", fontSize: 15 }}>
                      {s === "male" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>
                <p className="muted" style={{ margin: "8px 2px 0", fontSize: 12.5, lineHeight: 1.45 }}>
                  Used only in the calorie formula, which differs between men and women.
                </p>
              </div>

              <div className="grid3">
                <NumField label="HEIGHT" unit="cm" value={height} onChange={setHeight} />
                <NumField label="WEIGHT" unit="kg" value={weight} onChange={setWeight} />
                <NumField label="AGE" unit="yrs" value={age} onChange={setAge} />
              </div>

              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="label">BMI</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-text)" }}>
                    {bm ? bmiCategory(bm) : ""} {bm ? (bm < 18.5 ? "· under 18.5" : bm < 25 ? "· 18.5–24.9" : bm < 30 ? "· 25–29.9" : "· 30+") : ""}
                  </span>
                </div>
                <div className="display" style={{ fontSize: 40, fontWeight: 500, lineHeight: 1 }}>{bm ? bm.toFixed(1) : "—"}</div>
                <div style={{ position: "relative", height: 8, borderRadius: 4, overflow: "hidden", display: "flex", marginTop: 4 }}>
                  <i style={{ flex: 3.5, background: "#6f9bc4" }} />
                  <i style={{ flex: 6.5, background: "#5e9a63" }} />
                  <i style={{ flex: 5, background: "#d3a23a" }} />
                  <i style={{ flex: 5, background: "#c9573f" }} />
                </div>
                <div style={{ position: "relative", height: 0 }}>
                  <i style={{ position: "absolute", left: `${bmiPos}%`, top: -16, width: 3, height: 22, borderRadius: 2, background: "var(--ink)", transform: "translateX(-50%)" }} />
                </div>
                <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45 }}>
                  Weight relative to height. A rough screen, not a verdict. It ignores muscle.
                </p>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="label">Resting burn (BMR)</span>
                  <span className="muted" style={{ fontSize: 12 }}>Mifflin-St Jeor</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                  <span className="display" style={{ fontSize: 40, fontWeight: 500, lineHeight: 1 }}>{plan.bmr ? plan.bmr.toLocaleString() : "—"}</span>
                  <span className="muted" style={{ fontSize: 13 }}>kcal / day</span>
                </div>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 12.5 }}>What your body burns at rest, before any activity.</p>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <header>
                <h1 className="h1" style={{ fontSize: 30 }}>What&apos;s your goal?</h1>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45 }}>Pick what you&apos;re working toward. You can change this any time.</p>
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
                      style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 20, outline: on ? "2px solid var(--ink)" : "none" }}
                    >
                      <span style={{ width: 40, height: 40, borderRadius: 20, background: "var(--fill-1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name={g.icon} size={20} />
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontSize: 16, fontWeight: 600 }}>{g.label}</span>
                        <span className="muted" style={{ display: "block", fontSize: 12.5, marginTop: 2 }}>{g.hint}</span>
                      </span>
                      <span style={{ width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--ink)" : "transparent", color: "var(--ink-contrast)", border: on ? 0 : "1.5px solid var(--hair)" }}>
                        {on && <Icon name="check" size={14} stroke={2.6} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {goal !== "maintain" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: "0 0 150px" }}>
                      <NumField label="TARGET WEIGHT" unit="kg" value={target} onChange={setTarget} />
                    </div>
                    <p className="muted" style={{ margin: "18px 0 0", fontSize: 12.5, lineHeight: 1.45, flex: 1 }}>
                      {goalOk
                        ? `${Math.round(diff * 10) / 10} kg to go from ${w} kg. About ${weeks} weeks at this pace.`
                        : goal === "lose"
                          ? "Goal weight should be lower than your current weight."
                          : "Goal weight should be higher than your current weight."}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <div className="label" style={{ marginBottom: 10 }}>Activity level</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="radiogroup" aria-label="Activity level">
                  {ACTIVITIES.map((x) => {
                    const on = activity === x;
                    return (
                      <button
                        key={x}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setActivity(x)}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          borderRadius: 16,
                          border: on ? "1px solid var(--ink)" : "1px solid var(--hair)",
                          background: on ? "var(--ink)" : "transparent",
                          color: on ? "var(--ink-contrast)" : "var(--ink)",
                        }}
                      >
                        <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{ACTIVITY_LABEL[x]}</span>
                        <span style={{ display: "block", fontSize: 12.5, opacity: 0.72, marginTop: 1 }}>{ACTIVITY_HINT[x]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <header>
                <h1 className="h1" style={{ fontSize: 30 }}>Here&apos;s your plan</h1>
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45 }}>
                  Based on what you told us. Fine-tune it any time from Profile.
                </p>
              </header>

              <div className="card" style={{ position: "relative", paddingTop: 22 }}>
                <span className="tape" aria-hidden="true" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span className="label">Daily target</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-text)" }}>
                    {goal === "maintain" ? "Maintain weight" : `${goal === "lose" ? "Lose" : "Gain"} ${Math.round(diff * 10) / 10} kg in ~${weeks} weeks`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                  <span className="display" style={{ fontSize: 56, fontWeight: 500, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{plan.calories.toLocaleString()}</span>
                  <span className="muted" style={{ fontSize: 14 }}>kcal / day</span>
                </div>
                <p className="muted" style={{ margin: "8px 0 14px", fontSize: 13, lineHeight: 1.45 }}>
                  {goal === "maintain"
                    ? `About what you burn: ${plan.tdee.toLocaleString()} kcal a day.`
                    : `About ${Math.abs(plan.adjust)} ${goal === "lose" ? "below" : "above"} the ${plan.tdee.toLocaleString()} you burn, which is roughly ${plan.kgPerWeek} kg a week.`}
                </p>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }} aria-hidden="true">
                  <i style={{ width: `${pct.protein}%`, background: "var(--c-protein)" }} />
                  <i style={{ width: `${pct.carbs}%`, background: "var(--c-carbs)" }} />
                  <i style={{ width: `${pct.fat}%`, background: "var(--c-fat)" }} />
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                  {[
                    ["Protein", goals.protein, `${plan.proteinPerKg.toFixed(1)} g per kg`, "var(--c-protein)"],
                    ["Carbs", goals.carbs, `${pct.carbs}% of calories`, "var(--c-carbs)"],
                    ["Fat", goals.fat, `${pct.fat}% of calories`, "var(--c-fat)"],
                  ].map(([l, g, sub, c]) => (
                    <div key={String(l)} style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)" }}>
                        <i style={{ width: 7, height: 7, borderRadius: 4, background: String(c) }} />
                        {l}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{g} <span style={{ fontSize: 13, fontWeight: 500 }}>g</span></div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--hair)" }}>
                  <div style={{ flex: 1 }}>
                    <div className="muted" style={{ fontSize: 11.5 }}>Fibre</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{goals.fiber} g+</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="muted" style={{ fontSize: 11.5 }}>Added sugar</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>under {goals.sugar} g</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="muted" style={{ fontSize: 11.5 }}>Sodium</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>under {goals.sodium.toLocaleString()} mg</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="label" style={{ marginBottom: 6 }}>Why these numbers</div>
                {[
                  [
                    "Calories",
                    `Your resting burn (${plan.bmr.toLocaleString()}) times ${ACTIVITY_FACTOR[activity]} for ${ACTIVITY_HINT[activity].toLowerCase()} gives ${plan.tdee.toLocaleString()}. ${
                      goal === "lose"
                        ? `We take ${Math.abs(plan.adjust)} off to lose weight at a safe pace.`
                        : goal === "gain"
                          ? `We add ${plan.adjust} for a slow, steady gain.`
                          : "You eat about what you burn."
                    }${lowerBound ? ` We don't go below ${plan.calories.toLocaleString()} kcal.` : ""}`,
                  ],
                  [
                    `Protein: ${plan.proteinPerKg.toFixed(1)} g per kg`,
                    `Research on lifting finds gains level off around 1.6 g per kg. ${
                      goal === "lose" ? "People cutting do better with a little more, so we use 2.0." : goal === "gain" ? "We use 1.8 to support growth." : "We use 1.6."
                    } That's ${pct.protein}% of your calories, inside the 10–35% health range.`,
                  ],
                  [
                    "Fat and carbs",
                    `Fat takes ${pct.fat}% of calories (health bodies say 20–35%). Carbs fill the rest, so you keep energy for training.`,
                  ],
                ].map(([t1, body], i) => (
                  <div key={i} className="step">
                    <span className="num">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t1}</div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>{body}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {["Mifflin-St Jeor 1990", "Morton 2018", "Helms 2014", "US DRI", "WHO"].map((s) => (
                    <span key={s} className="chip" style={{ padding: "5px 10px", fontSize: 11.5 }}>{s}</span>
                  ))}
                </div>
                <p className="muted" style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.45 }}>
                  A starting point, not medical advice. Adjust it if your weight isn&apos;t moving after 2–3 weeks.
                </p>
              </div>
            </>
          )}
        </div>

        {step < 2 ? (
          <button type="button" className="btn" disabled={(step === 0 && !bodyOk) || (step === 1 && !goalOk)} onClick={() => setStep(step + 1)}>
            Continue
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn ghost" disabled={saving} onClick={() => void finish("/targets")}>
              Adjust
            </button>
            <button type="button" className="btn" disabled={saving} onClick={() => void finish("/")}>
              {saving ? "Saving…" : "Get started"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
