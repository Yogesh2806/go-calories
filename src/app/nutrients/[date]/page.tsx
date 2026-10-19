"use client";

import { use, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import {
  fromKey,
  goalsFor,
  isValidKey,
  kcal,
  sum,
  todayKey,
} from "@/lib/nutrition";

const TIPS: Record<string, string> = {
  protein: "chicken, eggs, Greek yoghurt, paneer, or a protein shake",
  carbs: "rice, oats, roti, fruit, or potatoes",
  fat: "nuts, seeds, olive oil, or avocado",
  fiber: "beans, lentils, oats, or vegetables",
};

export default function NutrientsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();
  const valid = isValidKey(date);
  const isToday = date === todayKey();

  const { entries, totals } = useMemo(() => {
    const es = app.entries.filter((e) => e.logDate === date);
    return { entries: es, totals: sum(es) };
  }, [app.entries, date]);

  useEffect(() => {
    if (!valid) router.replace("/");
  }, [valid, router]);

  if (!ok || !app.profile || !valid) return <Splash />;

  const goals = goalsFor(app.profile);
  const remaining = goals.calories - totals.calories;
  const pct = Math.min(100, Math.round((totals.calories / goals.calories) * 100));
  const dateLabel = fromKey(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const macros = [
    { key: "protein", label: "Protein", v: totals.protein, g: goals.protein, c: "var(--c-protein)" },
    { key: "carbs", label: "Carbs", v: totals.carbs, g: goals.carbs, c: "var(--c-carbs)" },
    { key: "fat", label: "Fat", v: totals.fat, g: goals.fat, c: "var(--c-fat)" },
  ];
  const micros = [
    { label: "Fiber", v: totals.fiber, g: goals.fiber, unit: "g", c: "var(--c-fiber)" },
    { label: "Sugar", v: totals.sugar, g: goals.sugar, unit: "g", c: "var(--c-sugar)" },
    { label: "Sodium", v: totals.sodium, g: goals.sodium, unit: "mg", c: "var(--c-sodium)" },
  ];
  const needs = [
    ...macros.map((m) => ({ key: m.key, label: m.label, short: m.g - m.v, unit: "g" })),
    { key: "fiber", label: "Fiber", short: goals.fiber - totals.fiber, unit: "g" },
  ].filter((n) => n.short >= 5);

  return (
    <Shell>
      <BackHeader
        title={isToday ? "Today's macros & micros" : "Macros & micros"}
        subtitle={dateLabel}
        onBack={() => (window.history.length > 1 ? router.back() : router.push(isToday ? "/" : `/day/${date}`))}
      />

      <div className="cols">
        <div className="stack">
          <section className="card">
            <div className="label">Calories</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>{kcal(totals.calories)}</span>
              <span style={{ fontSize: 15, color: "var(--ink-2)" }}>/ {kcal(goals.calories)} kcal</span>
            </div>
            <div className="bar" style={{ height: 10, marginTop: 14 }}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 13, color: remaining < 0 ? "var(--danger)" : "var(--ink-2)", marginTop: 10 }}>
              {remaining >= 0 ? `${kcal(remaining)} kcal remaining` : `${kcal(-remaining)} kcal over the goal`}
            </div>

          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="label">Macros</div>
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              {macros.map((m, i) => (
                <div key={m.key} style={i > 0 ? { borderTop: "1px solid var(--hair)", marginTop: 18, paddingTop: 18 } : undefined}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 500 }}>
                      <i style={{ width: 8, height: 8, borderRadius: "50%", background: m.c }} />
                      {m.label}
                    </span>
                    <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
                      {Math.round(m.v)}g <span className="muted">/ {m.g}g</span>
                    </span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.min(100, (m.v / Math.max(1, m.g)) * 100)}%`, background: m.c }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="label">Micronutrients</div>
            <div className="grid3">
              {micros.map((m) => (
                <div key={m.label} className="card sm">
                  <div className="muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.03em" }}>
                    <i style={{ width: 6, height: 6, borderRadius: "50%", background: m.c, flexShrink: 0 }} />
                    {m.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 4 }}>
                    {Math.round(m.v)}
                    <span className="muted" style={{ fontSize: 11.5, fontWeight: 500 }}>
                      {" "}
                      / {m.g}
                      {m.unit}
                    </span>
                  </div>
                  <div className="bar" style={{ height: 5, marginTop: 10 }}>
                    <i style={{ width: `${Math.min(100, (m.v / Math.max(1, m.g)) * 100)}%`, background: m.c }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
              Fiber, sugar and sodium are tracked. Vitamins and minerals aren&apos;t logged yet.
            </p>
          </section>

          {isToday && entries.length > 0 && needs.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="label">Still need today</div>
              <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                {needs.map((n, i) => (
                  <div
                    key={n.key}
                    style={{
                      display: "flex",
                      gap: 12,
                      ...(i > 0 ? { borderTop: "1px solid var(--hair)", marginTop: 16, paddingTop: 16 } : {}),
                    }}
                  >
                    <Icon name="target" size={20} style={{ color: "var(--ink-3)", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5 }}>
                        <b>{n.label}</b>
                        <span className="muted">
                          {" "}
                          · {Math.round(n.short)}
                          {n.unit} short
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>Try: {TIPS[n.key]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
}
