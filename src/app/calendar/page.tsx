"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp, useGuard } from "@/lib/app";
import Shell, { Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import { addDays, byDay, fromKey, kcal, sum, toKey, todayKey } from "@/lib/nutrition";

type Range = "week" | "month" | "year";
type Filter = "all" | "onTrack" | "over" | "none";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

interface Cell {
  key: string;
  day: number;
  inMonth: boolean;
  future: boolean;
  calories: number | null;
  fraction: number;
}

export default function CalendarPage() {
  const ok = useGuard();
  const app = useApp();
  const today = todayKey();
  const [range, setRange] = useState<Range>("month");
  const [filter, setFilter] = useState<Filter>("all");
  const [anchor, setAnchor] = useState<string>(today);
  const [selected, setSelected] = useState<string>(today);

  const days = useMemo(() => {
    const m = new Map<string, number>();
    byDay(app.entries).forEach((es, k) => m.set(k, sum(es).calories));
    return m;
  }, [app.entries]);

  if (!ok || !app.profile) return <Splash />;
  const goal = app.profile.calorieGoal;

  const cell = (d: Date, inMonth: boolean): Cell => {
    const key = toKey(d);
    const future = key > today;
    const cals = future ? null : (days.get(key) ?? null);
    return {
      key,
      day: d.getDate(),
      inMonth,
      future,
      calories: cals,
      fraction: cals == null ? 0 : Math.min(cals / goal, 1),
    };
  };
  const monthCells = (a: Date): Cell[] => {
    const y = a.getFullYear();
    const mo = a.getMonth();
    const first = new Date(y, mo, 1);
    const count = new Date(y, mo + 1, 0).getDate();
    const out: Cell[] = [];
    for (let i = first.getDay(); i > 0; i--) out.push(cell(addDays(first, -i), false));
    for (let d = 1; d <= count; d++) out.push(cell(new Date(y, mo, d), true));
    while (out.length % 7) out.push(cell(addDays(fromKey(out[out.length - 1].key), 1), false));
    return out;
  };
  const weekCells = (a: Date): Cell[] => {
    const sun = addDays(a, -a.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(sun, i);
      return cell(d, d.getMonth() === a.getMonth());
    });
  };
  const stats = (cells: Cell[]) => {
    const inM = cells.filter((c) => c.inMonth);
    const logged = inM.filter((c) => c.calories != null && c.calories > 0);
    const avg = logged.length ? Math.round(logged.reduce((s, c) => s + (c.calories ?? 0), 0) / logged.length) : 0;
    const good = (c: Cell) => c.calories != null && c.calories > 0 && c.calories / goal >= 0.8 && c.calories / goal <= 1.05;
    let best = 0;
    let cur = 0;
    for (const c of inM) {
      if (good(c)) {
        cur++;
        best = Math.max(best, cur);
      } else cur = 0;
    }
    return { avg, onTrack: inM.filter(good).length, logged: logged.length, best };
  };

  const a = fromKey(anchor);
  const cells = range === "week" ? weekCells(a) : monthCells(a);
  const monthStats = stats(monthCells(a));

  const matches = (c: Cell) => {
    const has = c.calories != null && c.calories > 0;
    if (filter === "onTrack") return has && (c.calories as number) / goal >= 0.8 && (c.calories as number) / goal <= 1.05;
    if (filter === "over") return has && (c.calories as number) > goal;
    if (filter === "none") return !has && !c.future;
    return true;
  };

  const step = (n: number) => {
    if (range === "week") setAnchor(toKey(addDays(a, 7 * n)));
    else if (range === "year") setAnchor(toKey(new Date(a.getFullYear() + n, a.getMonth(), 1)));
    else setAnchor(toKey(new Date(a.getFullYear(), a.getMonth() + n, 1)));
  };

  let title: string;
  if (range === "year") title = String(a.getFullYear());
  else if (range === "week") {
    const sun = addDays(a, -a.getDay());
    const sat = addDays(sun, 6);
    title = `${MONTHS_SHORT[sun.getMonth()]} ${sun.getDate()} – ${MONTHS_SHORT[sat.getMonth()]} ${sat.getDate()}, ${sat.getFullYear()}`;
  } else title = `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;

  const selCals = days.get(selected) ?? 0;
  const selFrac = Math.min(100, Math.round((selCals / goal) * 100));
  const selLabel = fromKey(selected).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const yearTiles = Array.from({ length: 12 }, (_, m) => {
    const st = stats(monthCells(new Date(a.getFullYear(), m, 1)));
    return {
      m,
      avg: st.avg,
      current: m === new Date().getMonth() && a.getFullYear() === new Date().getFullYear(),
    };
  });

  return (
    <Shell>
      <h1 className="h1">Calendar</h1>
      <div className="cols">
        <div className="stack">
          <div className="seg" role="tablist" aria-label="Range">
            {(["week", "month", "year"] as Range[]).map((r) => (
              <button key={r} type="button" role="tab" aria-selected={range === r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>
                {r[0].toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div className="scroll-x">
            {(
              [
                ["all", "All days"],
                ["onTrack", "On track"],
                ["over", "Over goal"],
                ["none", "No log"],
              ] as [Filter, string][]
            ).map(([f, label]) => (
              <button key={f} type="button" className={`chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
                {label}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 36px", alignItems: "center" }}>
              <button type="button" className="iconbtn" aria-label="Previous" onClick={() => step(-1)}>
                <Icon name="chevL" size={18} />
              </button>
              <div style={{ textAlign: "center", fontSize: 15, fontWeight: 600 }}>{title}</div>
              <button type="button" className="iconbtn" aria-label="Next" onClick={() => step(1)}>
                <Icon name="chevR" size={18} />
              </button>
            </div>

            {range === "year" ? (
              <div className="grid3" style={{ marginTop: 18 }}>
                {yearTiles.map((t) => (
                  <button
                    key={t.m}
                    type="button"
                    onClick={() => {
                      setAnchor(toKey(new Date(a.getFullYear(), t.m, 1)));
                      setRange("month");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "14px 0",
                      borderRadius: 18,
                      background: t.current ? "var(--accent)" : "var(--fill-2)",
                      color: t.current ? "var(--accent-on)" : "var(--ink)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: t.current ? 700 : 600 }}>{MONTHS_SHORT[t.m]}</span>
                    <span style={{ fontSize: 10, opacity: t.current ? 0.9 : 0.6 }}>{t.avg > 0 ? `${kcal(t.avg)} kcal` : "—"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginTop: 18 }}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i} className="muted" style={{ textAlign: "center", fontSize: 11.5, fontWeight: 600 }}>
                      {d}
                    </span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", rowGap: 14, marginTop: 14 }}>
                  {cells.map((c) => {
                    const isToday = c.key === today;
                    const isSel = c.key === selected;
                    const base = !c.inMonth ? (c.calories == null ? 0.3 : 0.5) : 1;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        aria-label={c.key}
                        aria-pressed={isSel}
                        onClick={() => setSelected(c.key)}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: base * (matches(c) ? 1 : 0.32) }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13.5,
                            fontWeight: isToday ? 700 : 400,
                            background: isToday ? "var(--accent)" : isSel ? "var(--fill-1)" : "transparent",
                            color: isToday ? "var(--accent-on)" : c.inMonth ? "var(--ink)" : "var(--ink-3)",
                            boxShadow: isSel ? "inset 0 0 0 1.5px var(--accent)" : "none",
                          }}
                        >
                          {c.day}
                        </span>
                        <span style={{ display: "block", width: 20, height: 3, borderRadius: 2, background: c.calories == null ? "transparent" : "var(--track)", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${Math.round(c.fraction * 100)}%`, background: "var(--accent)" }} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <Link href={`/day/${selected}`} className="card" style={{ display: "block" }} aria-label="Open selected day breakdown">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="label">Selected day</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{selLabel}</div>
              </div>
              <Icon name="chevR" size={16} style={{ color: "var(--ink-3)" }} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{kcal(selCals)}</span>
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>/ {kcal(goal)} kcal</span>
              </div>
              <div className="bar" style={{ marginTop: 10 }}>
                <i style={{ width: `${selFrac}%` }} />
              </div>
            </div>
          </Link>

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="label">{MONTHS[a.getMonth()]}</div>
            <div className="grid3">
              <div className="card sm">
                <div className="muted" style={{ fontSize: 10.5 }}>AVG / DAY</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6 }}>{kcal(monthStats.avg)} kcal</div>
              </div>
              <div className="card sm">
                <div className="muted" style={{ fontSize: 10.5 }}>ON TRACK</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6 }}>
                  {monthStats.onTrack} / {monthStats.logged} days
                </div>
              </div>
              <div className="card sm">
                <div className="muted" style={{ fontSize: 10.5 }}>BEST STREAK</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6 }}>{monthStats.best} days</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
