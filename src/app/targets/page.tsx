"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import { Field, NumInput } from "@/components/ui";
import {
  FAT_RANGE,
  FAT_STANDARD,
  PROTEIN_RANGE,
  PROTEIN_STANDARD,
  calorieFloor,
  goalsFor,
  macroPercents,
  makePlan,
  num,
} from "@/lib/nutrition";
import type { Profile } from "@/lib/types";

export default function TargetsPage() {
  const ok = useGuard();
  const app = useApp();
  if (!ok || !app.profile) return <Splash />;
  return <Editor profile={app.profile} />;
}

function Editor({ profile: p }: { profile: Profile }) {
  const app = useApp();
  const router = useRouter();
  const plan = makePlan(p);
  const [kc, setKc] = useState(String(p.calorieGoal));
  const [pk, setPk] = useState(p.proteinPerKg);
  const [fp, setFp] = useState(p.fatPct);
  const [saving, setSaving] = useState(false);

  const floor = calorieFloor(p.sex);
  const kcN = Math.round(num(kc));
  const valid = kcN >= 800 && kcN <= 8000;
  const g = goalsFor({ ...p, calorieGoal: valid ? kcN : p.calorieGoal, proteinPerKg: pk, fatPct: fp });
  const pct = macroPercents(g);
  const cappedProtein = pk * p.weightKg > g.protein + 1 && pk * p.weightKg > 0;

  const presets: { key: string; label: string; hint: string; pk: number; fp: number }[] = [
    { key: "suggested", label: "Suggested", hint: `${plan.proteinPerKg} g/kg · ${plan.fatPct}% fat`, pk: plan.proteinPerKg, fp: plan.fatPct },
    { key: "balanced", label: "Balanced", hint: "1.4 g/kg · 30% fat", pk: 1.4, fp: 30 },
    { key: "protein", label: "High protein", hint: "2.2 g/kg · 25% fat", pk: 2.2, fp: 25 },
  ];
  const activePreset = presets.find((x) => x.pk === pk && x.fp === fp)?.key ?? null;

  const dirty = valid && (kcN !== p.calorieGoal || pk !== p.proteinPerKg || fp !== p.fatPct);
  const outside = pk < PROTEIN_STANDARD.min || pk > PROTEIN_STANDARD.max || fp < FAT_STANDARD.min || fp > FAT_STANDARD.max;

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      await app.saveProfile({ calorieGoal: kcN, proteinPerKg: pk, fatPct: fp });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const bar = [
    { k: "Protein", w: pct.protein, c: "var(--c-protein)" },
    { k: "Carbs", w: pct.carbs, c: "var(--c-carbs)" },
    { k: "Fat", w: pct.fat, c: "var(--c-fat)" },
  ];

  return (
    <Shell nav={false} narrow>
      <BackHeader title="Edit targets" onBack={() => (window.history.length > 1 ? router.back() : router.push("/profile"))} />

      <div className="scroll-x" style={{ gap: 8 }} role="radiogroup" aria-label="Presets">
        {presets.map((x) => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={activePreset === x.key}
            className={`chip${activePreset === x.key ? " on" : ""}`}
            style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", borderRadius: 16, padding: "10px 14px", gap: 2 }}
            onClick={() => {
              setPk(x.pk);
              setFp(x.fp);
            }}
          >
            <span style={{ fontWeight: 600 }}>{x.label}</span>
            <span style={{ fontSize: 11.5, opacity: 0.7 }}>{x.hint}</span>
          </button>
        ))}
      </div>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="CALORIES PER DAY">
          <NumInput value={kc} onChange={setKc} step="10" />
        </Field>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          You burn about {plan.tdee.toLocaleString()} kcal a day. Suggested: {plan.calories.toLocaleString()} kcal
          {p.goal === "lose" ? ` (${Math.abs(plan.adjust)} below, about ${plan.kgPerWeek} kg a week)` : p.goal === "gain" ? ` (${plan.adjust} above)` : ""}.
        </div>
        {valid && kcN < floor && (
          <div role="status" style={{ fontSize: 12.5, color: "var(--danger)", lineHeight: 1.45 }}>
            Below {floor.toLocaleString()} kcal is lower than we normally suggest. Check with a doctor or dietitian before eating this little.
          </div>
        )}
        {!valid && (
          <div role="status" style={{ fontSize: 12.5, color: "var(--danger)" }}>Enter between 800 and 8,000 kcal.</div>
        )}

        <Slider
          label="Protein"
          value={pk}
          min={PROTEIN_RANGE.min}
          max={PROTEIN_RANGE.max}
          step={0.1}
          unit="g/kg"
          standard={PROTEIN_STANDARD}
          onChange={setPk}
          right={`${g.protein} g`}
        />
        {cappedProtein && (
          <div className="muted" style={{ fontSize: 12, marginTop: -8 }}>Capped at 35% of your calories.</div>
        )}
        <Slider
          label="Fat"
          value={fp}
          min={FAT_RANGE.min}
          max={FAT_RANGE.max}
          step={1}
          unit="%"
          standard={FAT_STANDARD}
          onChange={setFp}
          right={`${g.fat} g`}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Carbs</span>
          <span style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
            {g.carbs} g <span className="muted" style={{ fontSize: 12 }}>· the rest, automatic</span>
          </span>
        </div>
        {outside && (
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
            Outside the usual range (protein {PROTEIN_STANDARD.min}–{PROTEIN_STANDARD.max} g/kg, fat {FAT_STANDARD.min}–{FAT_STANDARD.max}%). Fine if you know why.
          </div>
        )}
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="label">Your day</div>
        <div role="img" aria-label={`Protein ${pct.protein}%, carbs ${pct.carbs}%, fat ${pct.fat}% of calories`} style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 }}>
          {bar.map((b) => (
            <i key={b.k} style={{ width: `${b.w}%`, background: b.c, display: "block" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            ["Protein", g.protein, pct.protein, "var(--c-protein)"],
            ["Carbs", g.carbs, pct.carbs, "var(--c-carbs)"],
            ["Fat", g.fat, pct.fat, "var(--c-fat)"],
          ].map(([k, v, w, c]) => (
            <div key={String(k)}>
              <div className="muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <i style={{ width: 8, height: 8, borderRadius: 4, background: String(c) }} />
                {k}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{v} g</div>
              <div className="muted" style={{ fontSize: 12 }}>{w}% of kcal</div>
            </div>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          Fibre {g.fiber} g · sugar under {g.sugar} g · sodium under {g.sodium.toLocaleString()} mg
        </div>
      </section>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="btn ghost"
          style={{ flex: 1 }}
          disabled={kcN === plan.calories && pk === plan.proteinPerKg && fp === plan.fatPct}
          onClick={() => {
            setKc(String(plan.calories));
            setPk(plan.proteinPerKg);
            setFp(plan.fatPct);
          }}
        >
          Reset to suggested
        </button>
        <button type="button" className="btn" style={{ flex: 1 }} disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="muted" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5 }}>
        Sources: Mifflin–St Jeor (1990) for resting burn; Morton et al. 2018 and Helms 2014 for protein; US Dietary Reference Intakes for fat, fibre and sodium; WHO for sugar; CDC for pace.
        The calorie floors, the +300 kcal gain and the exact 2.0 / 1.6 / 1.8 g/kg protein figures are our own rule.
      </p>
    </Shell>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  standard,
  onChange,
  right,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  standard: { min: number; max: number };
  onChange: (v: number) => void;
  right: string;
}) {
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const shown = step < 1 ? value.toFixed(1) : String(value);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
          {right} <span className="muted" style={{ fontSize: 12 }}>· {shown} {unit}</span>
        </span>
      </div>
      <div className="range-wrap">
        <i className="range-std" style={{ left: pos(standard.min), width: `calc(${pos(standard.max)} - ${pos(standard.min)})` }} aria-hidden="true" />
        <input
          type="range"
          className="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${label} (${unit})`}
          onChange={(e) => onChange(Math.round(Number(e.target.value) * 10) / 10)}
        />
      </div>
      <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 2 }}>
        <span>{min}</span>
        <span>usual {standard.min}–{standard.max}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
