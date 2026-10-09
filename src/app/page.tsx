"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp, useGuard } from "@/lib/app";
import Shell, { Splash } from "@/components/Shell";
import EntryRow from "@/components/EntryRow";
import Icon from "@/components/Icon";
import { MEAL_LABEL } from "@/lib/types";
import { formatTime, goalsFor, greeting, kcal, sum, todayKey, toKey } from "@/lib/nutrition";

export default function Home() {
  const ok = useGuard();
  const app = useApp();
  const profile = app.profile;
  const today = todayKey();

  const { todayEntries, totals, recent } = useMemo(() => {
    const te = app.entries.filter((e) => e.logDate === today);
    const rec = [...app.entries]
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
      .slice(0, 4);
    return { todayEntries: te, totals: sum(te), recent: rec };
  }, [app.entries, today]);

  if (!ok || !profile) return <Splash />;

  const goals = goalsFor(profile);
  const remaining = goals.calories - totals.calories;
  const pct = Math.min(100, Math.round((totals.calories / goals.calories) * 100));
  const dateLabel = new Date()
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    .toUpperCase();

  return (
    <Shell>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="label">{dateLabel}</div>
          <h1 className="h1" style={{ marginTop: 4 }}>
            {greeting()}, {profile.name || "there"}
          </h1>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: "var(--ink)",
            color: "var(--ink-contrast)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          {(profile.name || "Y").charAt(0).toUpperCase()}
        </Link>
      </header>

      <div className="cols">
        <div className="stack">
          <Link href={`/day/${today}`} className="card" style={{ display: "block" }} aria-label="Open today's breakdown">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="label">Today&apos;s Consumption</span>
              <Icon name="chevR" size={16} style={{ color: "var(--ink-3)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em" }}>{kcal(totals.calories)}</span>
              <span style={{ fontSize: 15, color: "var(--ink-2)" }}>of {kcal(goals.calories)} kcal</span>
            </div>
            <div className="bar" style={{ height: 10, marginTop: 14 }}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 13, color: remaining < 0 ? "var(--danger)" : "var(--ink-2)", marginTop: 10 }}>
              {remaining >= 0
                ? `${kcal(remaining)} kcal remaining today`
                : `${kcal(-remaining)} kcal over today's goal`}
            </div>
            <div className="grid3" style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--hair)" }}>
              {[
                { v: totals.protein, g: goals.protein, label: "Protein", c: "var(--c-protein)" },
                { v: totals.carbs, g: goals.carbs, label: "Carbs", c: "var(--c-carbs)" },
                { v: totals.fat, g: goals.fat, label: "Fat", c: "var(--c-fat)" },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(m.v)}g</div>
                  <div className="muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <i style={{ width: 7, height: 7, borderRadius: 4, background: m.c }} />
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </Link>
        </div>

        <div className="stack">
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="label">Recently logged</div>
            {recent.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "30px 22px" }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Nothing logged yet</div>
                <p className="muted" style={{ fontSize: 13.5, margin: "6px 0 18px", lineHeight: 1.45 }}>
                  Log your first meal — describe it, scan it, or type it in.
                </p>
                <Link href="/add" className="btn" style={{ maxWidth: 220, margin: "0 auto" }}>
                  <Icon name="plus" size={18} /> Log food
                </Link>
              </div>
            ) : (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px" }}>
                {recent.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    sub={`${MEAL_LABEL[e.meal]} · ${
                      e.logDate === today
                        ? formatTime(e.loggedAt)
                        : new Date(e.logDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }`}
                  />
                ))}
              </div>
            )}
          </section>
          {todayEntries.length > 0 && (
            <Link href={`/day/${toKey(new Date())}`} className="muted" style={{ fontSize: 13, textAlign: "center" }}>
              See macros &amp; micros for today →
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}
