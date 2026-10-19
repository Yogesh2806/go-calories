"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp, useGuard } from "@/lib/app";
import Shell, { Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import GoalBlock from "@/components/GoalBlock";
import MealSections from "@/components/MealSections";
import { goalsFor, streakInfo, sum, todayKey } from "@/lib/nutrition";
import { dismissReminder, dueReminder, loadReminders } from "@/lib/reminders";
import type { Entry } from "@/lib/types";

export default function Home() {
  const ok = useGuard();
  const app = useApp();
  const profile = app.profile;
  const today = todayKey();
  const [edit, setEdit] = useState(false);
  const [nudgeTick, setNudgeTick] = useState(0);

  const { todayEntries, totals, streak } = useMemo(() => {
    const te = app.entries.filter((e) => e.logDate === today);
    return { todayEntries: te, totals: sum(te), streak: streakInfo(app.entries) };
  }, [app.entries, today]);

  // Reminders live on this device; read them after mount so the server and first client render agree.
  const [due, setDue] = useState<ReturnType<typeof dueReminder>>(null);
  useEffect(() => {
    setDue(dueReminder(todayEntries, loadReminders()));
  }, [todayEntries, nudgeTick]);

  if (!ok || !profile) return <Splash />;

  const style = profile.style;
  const goals = goalsFor(profile);
  const rawDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  const dateLabel = style === "paper" ? rawDate.replace(", ", " · ") : rawDate;

  async function remove(e: Entry) {
    const gone = { ...e };
    try {
      await app.deleteEntry(e.id);
      app.notify(`Removed ${gone.name}`, { label: "Undo", run: () => void app.addEntries([gone]) });
    } catch {
      /* deleteEntry already showed the error */
    }
  }

  return (
    <Shell composer>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="label">{dateLabel}</div>
          <h1 className="h1" style={{ marginTop: 4, ...(style === "glass" ? { fontSize: 30, letterSpacing: "-0.02em" } : {}) }}>
            Today
          </h1>
        </div>
        <Link href="/streaks" className="streak-chip" aria-label={`${streak.current}-day streak`} style={{ marginTop: 4 }}>
          <Icon name="flame" size={16} stroke={2} />
          <span>{streak.current > 0 ? `${streak.current}-day streak` : "Start a streak"}</span>
        </Link>
      </header>

      <GoalBlock style={style} totals={totals} goals={goals} />

      {due && (
        <div className="card sm" style={{ display: "flex", alignItems: "center", gap: 12 }} role="status">
          <Icon name="bell" size={18} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
            <b>Time for {due.label.toLowerCase()}?</b>
            <span className="muted"> Nothing logged yet.</span>
          </div>
          <Link href="/write" className="pill">
            Log it
          </Link>
          <button
            type="button"
            className="iconbtn"
            aria-label="Dismiss reminder"
            style={{ width: 30, height: 30 }}
            onClick={() => {
              dismissReminder(due.meal);
              setNudgeTick((n) => n + 1);
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {todayEntries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "30px 22px" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Nothing logged yet</div>
          <p className="muted" style={{ fontSize: 13.5, margin: "6px 0 0", lineHeight: 1.45 }}>
            Just write what you ate in the bar below, like &ldquo;2 idli with sambar and filter coffee&rdquo;.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: -8 }}>
            <span className="label">Logged today</span>
            <button type="button" className="pill" style={{ height: 30 }} onClick={() => setEdit((v) => !v)} aria-pressed={edit}>
              {edit ? "Done" : "Edit"}
            </button>
          </div>
          <MealSections entries={todayEntries} edit={edit} onDelete={remove} />
          <Link href={`/day/${today}`} className="muted" style={{ fontSize: 13, textAlign: "center" }}>
            See macros &amp; micros for today →
          </Link>
        </>
      )}
    </Shell>
  );
}
