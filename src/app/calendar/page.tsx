"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp, useGuard } from "@/lib/app";
import Shell, { Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import { addDays, byDay, fromKey, goalsFor, kcal, streakInfo, sum, toKey, todayKey } from "@/lib/nutrition";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ON_TARGET = (cals: number, goal: number) => cals / goal >= 0.8 && cals / goal <= 1.05;

export default function CalendarPage() {
  const ok = useGuard();
  const app = useApp();
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(today);

  const { days, streak } = useMemo(() => {
    const m = new Map<string, ReturnType<typeof sum>>();
    byDay(app.entries).forEach((es, k) => m.set(k, sum(es)));
    return { days: m, streak: streakInfo(app.entries) };
  }, [app.entries]);

  if (!ok || !app.profile) return <Splash />;
  const goals = goalsFor(app.profile);
  const goal = goals.calories;

  // Monday-first month grid
  const y = month.getFullYear();
  const mo = month.getMonth();
  const count = new Date(y, mo + 1, 0).getDate();
  const lead = (month.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => toKey(new Date(y, mo, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  // "so far": from the first logged day of the month (or the 1st) up to yesterday; today only once it is on target
  const monthKeys = cells.filter((c): c is string => !!c);
  const loggedKeys = monthKeys.filter((k) => (days.get(k)?.calories ?? 0) > 0 && k <= today);
  const firstLogged = loggedKeys[0];
  const span = firstLogged ? monthKeys.filter((k) => k >= firstLogged && k < today) : [];
  const onTargetDays = span.filter((k) => ON_TARGET(days.get(k)?.calories ?? 0, goal)).length;
  const avg = loggedKeys.length ? Math.round(loggedKeys.reduce((s, k) => s + (days.get(k)?.calories ?? 0), 0) / loggedKeys.length) : 0;
  const avgP = loggedKeys.length ? Math.round(loggedKeys.reduce((s, k) => s + (days.get(k)?.protein ?? 0), 0) / loggedKeys.length) : 0;

  const sel = days.get(selected);
  const selEntries = app.entries.filter((e) => e.logDate === selected);
  const selMeals = new Set(selEntries.map((e) => e.meal)).size;
  const sd = fromKey(selected);
  const selLabel = `${sd.toLocaleDateString("en-US", { weekday: "short" })} ${sd.getDate()} ${sd.toLocaleDateString("en-US", { month: "short" })}`.toUpperCase();
  const canNext = new Date(y, mo + 1, 1) <= addDays(fromKey(today), 31);

  return (
    <Shell>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="h1">Calendar</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Tap a day to open its note</div>
        </div>
        <Link href="/streaks" className="streak-chip" aria-label={`${streak.current}-day streak`} style={{ marginTop: 4 }}>
          <Icon name="flame" size={16} stroke={2} />
          <span>{streak.current > 0 ? `${streak.current}-day streak` : "Start a streak"}</span>
        </Link>
      </header>

      <div className="cols">
        <div className="stack">
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center" }}>
              <button type="button" className="iconbtn" style={{ width: 40, height: 40 }} aria-label="Previous month" onClick={() => setMonth(new Date(y, mo - 1, 1))}>
                <Icon name="chevL" size={18} />
              </button>
              <div style={{ textAlign: "center", fontSize: 16, fontWeight: 700 }}>{MONTHS[mo]} {y}</div>
              <button type="button" className="iconbtn" style={{ width: 40, height: 40 }} aria-label="Next month" disabled={!canNext} onClick={() => setMonth(new Date(y, mo + 1, 1))}>
                <Icon name="chevR" size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginTop: 16 }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="muted" style={{ textAlign: "center", fontSize: 11.5, fontWeight: 600 }}>
                  {d}
                </span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", rowGap: 6, marginTop: 8 }}>
              {cells.map((k, i) => {
                if (!k) return <span key={`b${i}`} />;
                const future = k > today;
                const cals = days.get(k)?.calories ?? 0;
                const logged = cals > 0 && !future;
                const good = logged && ON_TARGET(cals, goal);
                const isSel = k === selected;
                const isToday = k === today;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-label={`${fromKey(k).toLocaleDateString("en-US", { month: "long", day: "numeric" })}${logged ? `, ${kcal(cals)} calories` : ""}`}
                    aria-pressed={isSel}
                    onClick={() => setSelected(k)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0" }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14.5,
                        fontWeight: isSel || isToday ? 700 : 500,
                        background: isSel ? "var(--ink)" : "transparent",
                        color: isSel ? "var(--ink-contrast)" : future ? "var(--ink-3)" : "var(--ink)",
                        boxShadow: isToday && !isSel ? "inset 0 0 0 1.5px var(--accent)" : "none",
                        opacity: future ? 0.6 : 1,
                      }}
                    >
                      {fromKey(k).getDate()}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        background: good ? "var(--ok)" : logged ? "var(--ink-3)" : "transparent",
                        opacity: logged && !good ? 0.55 : 1,
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="muted" style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 12, fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i style={{ width: 6, height: 6, borderRadius: 3, background: "var(--ok)" }} /> On target
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i style={{ width: 6, height: 6, borderRadius: 3, background: "var(--ink-3)", opacity: 0.55 }} /> Logged
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i style={{ width: 6, height: 6, borderRadius: 3, border: "1px solid var(--ink-3)" }} /> Nothing
              </span>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="label">
                {selLabel}
                {selected === today ? " · TODAY" : ""}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span className="display" style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {kcal(sel?.calories ?? 0)}
                </span>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>of {kcal(goal)} kcal</span>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                {selEntries.length === 0
                  ? "Nothing written yet"
                  : `P ${Math.round(sel?.protein ?? 0)} g · C ${Math.round(sel?.carbs ?? 0)} g · F ${Math.round(sel?.fat ?? 0)} g · ${selMeals} meal${selMeals === 1 ? "" : "s"}`}
              </div>
            </div>
            <Link
              href={selected === today ? "/" : `/day/${selected}`}
              className="btn"
              style={{ width: "auto", minHeight: 42, padding: "0 16px", fontSize: 14, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Open note
              <Icon name="chevR" size={14} stroke={2.2} />
            </Link>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span className="label">{MONTHS[mo]} so far</span>
              <span className="muted" style={{ fontSize: 12 }}>goal {kcal(goal)} kcal</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
              <div>
                <div className="display" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}>
                  {onTargetDays}/{span.length}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>days on target</div>
              </div>
              <div>
                <div className="display" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}>{kcal(avg)}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>kcal a day</div>
              </div>
              <div>
                <div className="display" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.1 }}>{avgP}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>g protein</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
