"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import Icon, { type IconName } from "@/components/Icon";
import { Toggle } from "@/components/ui";
import { streakInfo } from "@/lib/nutrition";
import { DEFAULT_REMINDERS, REMINDER_MEALS, loadReminders, saveReminders, type Reminders } from "@/lib/reminders";
import { MEAL_LABEL } from "@/lib/types";

function Badge({ icon, title, sub, earned }: { icon: IconName; title: string; sub: string; earned: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6 }}>
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: earned ? "var(--ink)" : "var(--accent-soft)",
          color: earned ? "var(--ink-contrast)" : "var(--ink-3)",
          border: earned ? "0" : "1.5px dashed var(--ink-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={24} />
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{title}</span>
      <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.2 }}>{sub}</span>
    </div>
  );
}

export default function StreaksPage() {
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();
  const info = useMemo(() => streakInfo(app.entries), [app.entries]);
  const [rem, setRem] = useState<Reminders>(DEFAULT_REMINDERS);
  useEffect(() => setRem(loadReminders()), []);

  if (!ok || !app.profile) return <Splash />;

  const change = (next: Reminders) => {
    setRem(next);
    saveReminders(next);
  };
  const anyOn = REMINDER_MEALS.some((m) => rem[m].on);
  const days = info.totalDays;

  return (
    <Shell narrow>
      <BackHeader title="Streaks & reminders" onBack={() => (window.history.length > 1 ? router.back() : router.push("/"))} />

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Your streak</div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="display" style={{ fontSize: 60, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>{info.current}</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "var(--ink-2)" }}>day streak</span>
            </div>
            <span className="pill" style={{ height: 30 }}>
              <Icon name="star" size={14} stroke={2} /> Best {info.best}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            {info.week.map((d) => (
              <div key={d.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)" }}>{d.label}</span>
                {d.logged ? (
                  <span style={{ width: 34, height: 34, borderRadius: 17, background: "var(--ink)", color: "var(--ink-contrast)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check" size={17} stroke={2.4} />
                  </span>
                ) : (
                  <span style={{ width: 34, height: 34, borderRadius: 17, border: `1.5px dashed ${d.isToday ? "var(--accent)" : "var(--ink-3)"}`, display: "block" }} />
                )}
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            {info.loggedToday ? "Logged today — see you tomorrow." : info.current > 0 ? "Log anything today to keep it going." : "Log a meal today to start your streak."}
          </div>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Badges</div>
        <div className="card" style={{ display: "flex", gap: 6, padding: "18px 12px" }}>
          <Badge icon="check" title="First log" sub={days > 0 ? "Earned" : "Log a meal"} earned={days > 0} />
          <Badge icon="flame" title="7 days" sub={info.best >= 7 ? "Earned" : `${Math.min(info.best, 7)} of 7`} earned={info.best >= 7} />
          <Badge icon="bolt" title="14 days" sub={info.best >= 14 ? "Earned" : `${Math.min(info.best, 14)} of 14`} earned={info.best >= 14} />
          <Badge icon="star" title="30 days" sub={info.best >= 30 ? "Earned" : `${Math.min(info.best, 30)} of 30`} earned={info.best >= 30} />
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Reminders</div>
        <div className="card list">
          <div className="row" style={{ minHeight: 60 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="pill" style={{ width: 36, height: 36, padding: 0, justifyContent: "center", borderRadius: 18 }}>
                <Icon name="bell" size={18} />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>Meal reminders</span>
                <span className="muted" style={{ display: "block", fontSize: 13, marginTop: 1 }}>A gentle nudge to write it down</span>
              </span>
            </span>
            <Toggle
              label="Meal reminders"
              on={anyOn}
              onChange={(v) => change({ breakfast: { ...rem.breakfast, on: v }, lunch: { ...rem.lunch, on: v }, dinner: { ...rem.dinner, on: v } })}
            />
          </div>
          {REMINDER_MEALS.map((m) => (
            <div key={m} className="row" style={{ minHeight: 60 }}>
              <span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{MEAL_LABEL[m]}</span>
                <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 1 }}>
                  <input
                    type="time"
                    aria-label={`${MEAL_LABEL[m]} reminder time`}
                    value={rem[m].time}
                    onChange={(e) => e.target.value && change({ ...rem, [m]: { ...rem[m], time: e.target.value } })}
                    style={{ border: 0, background: "var(--fill-1)", borderRadius: 8, padding: "2px 6px", fontSize: 13 }}
                  />
                </label>
              </span>
              <Toggle label={`${MEAL_LABEL[m]} reminder`} on={rem[m].on} onChange={(v) => change({ ...rem, [m]: { ...rem[m], on: v } })} />
            </div>
          ))}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, padding: "0 4px" }}>
          For now a reminder shows up at the top of Today once its time has passed and that meal isn&apos;t logged yet. It&apos;s saved on this
          device only. Notifications that reach your lock screen need push support, which isn&apos;t built yet.
        </p>
      </section>
    </Shell>
  );
}
