"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import { MealPicker, Sheet } from "@/components/ui";
import { defaultMeal, formatTime, fromKey, kcal, todayKey, uid } from "@/lib/nutrition";
import { MEAL_LABEL, type Entry, type Meal, type Preset } from "@/lib/types";

/** Saved meals: foods and whole meals you've locked or saved, one tap to add. */
export default function SavedPage() {
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<Meal>(() => defaultMeal());
  const [pick, setPick] = useState(false);
  const [edit, setEdit] = useState(false);

  const uses = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of app.entries) m.set(e.name.toLowerCase(), (m.get(e.name.toLowerCase()) ?? 0) + 1);
    return m;
  }, [app.entries]);

  if (!ok || !app.profile) return <Splash />;

  const date = app.logDate || todayKey();
  const isToday = date === todayKey();
  const needle = q.trim().toLowerCase();
  const list = app.presets.filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.serving.toLowerCase().includes(needle));
  const targetLabel = `${MEAL_LABEL[meal]} · ${
    isToday ? `Today, ${formatTime(new Date().toISOString())}` : fromKey(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }`;

  async function add(p: Preset) {
    const when = isToday ? new Date() : new Date(fromKey(date).setHours(12, 0, 0, 0));
    const entry: Entry = {
      id: uid(),
      logDate: date,
      loggedAt: when.toISOString(),
      source: "preset",
      name: p.name,
      serving: p.serving,
      meal,
      calories: p.calories,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      fiber: p.fiber,
      sugar: p.sugar,
      sodium: p.sodium,
    };
    try {
      await app.addEntries([entry]);
      app.notify(`Added ${p.name} to ${MEAL_LABEL[meal].toLowerCase()}`, { label: "Undo", run: () => void app.deleteEntry(entry.id) });
    } catch {
      /* addEntries already showed the error */
    }
  }

  function leave() {
    app.setLogDate("");
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <Shell nav={false} narrow>
      <BackHeader
        title="Saved meals"
        subtitle="Tap + to add one to your day."
        onBack={leave}
        right={
          app.presets.length > 0 ? (
            <button type="button" className="pill" style={{ height: 34 }} onClick={() => setEdit((v) => !v)} aria-pressed={edit}>
              {edit ? "Done" : "Edit"}
            </button>
          ) : undefined
        }
      />

      <div style={{ position: "relative" }}>
        <Icon name="search" size={18} style={{ position: "absolute", left: 16, top: 15, color: "var(--ink-3)", pointerEvents: "none" }} />
        <input
          className="input"
          style={{ paddingLeft: 44, borderRadius: 24, minHeight: 48 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search saved meals"
          aria-label="Search saved meals"
        />
      </div>

      {app.presets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "30px 22px" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No saved meals yet</div>
          <p className="muted" style={{ fontSize: 13.5, margin: "6px 0 0", lineHeight: 1.5 }}>
            On the Write screen, tap a line and switch on &ldquo;Lock this estimate&rdquo;, or use &ldquo;Save as a meal&rdquo; to keep
            everything you wrote. It shows up here.
          </p>
        </div>
      ) : (
        <div className="sec" style={{ paddingBottom: 4 }}>
          {list.length === 0 && <p className="muted" style={{ fontSize: 13.5, margin: "8px 0 12px" }}>Nothing matches &ldquo;{q}&rdquo;.</p>}
          {list.map((p) => {
            const n = uses.get(p.name.toLowerCase()) ?? 0;
            return (
              <div key={p.id} className="line" style={{ padding: "12px 0" }}>
                {edit && (
                  <button type="button" className="line-del" aria-label={`Delete ${p.name}`} onClick={() => app.deletePreset(p.id)}>
                    <Icon name="trash" size={20} />
                  </button>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="line-name" style={{ fontSize: undefined }}>{p.name}</span>
                  <span className="line-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.serving}</span>
                  {n > 0 && <span className="line-sub" style={{ fontSize: 12, marginTop: 1 }}>Used {n} time{n === 1 ? "" : "s"}</span>}
                </span>
                <span className="line-kcal">{kcal(p.calories)}</span>
                {!edit && (
                  <button
                    type="button"
                    className="sendbtn"
                    style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, background: "var(--ink)", color: "var(--ink-contrast)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label={`Add ${p.name} to ${MEAL_LABEL[meal]}`}
                    onClick={() => void add(p)}
                  >
                    <Icon name="plus" size={20} stroke={2.2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(24px + env(safe-area-inset-bottom))",
          width: "min(calc(100% - 32px), 508px)",
          height: 58,
          borderRadius: 29,
          background: "var(--ink)",
          color: "var(--ink-contrast)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px 0 20px",
          boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
          zIndex: 19,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.78 }}>Adding to</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{targetLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setPick(true)}
          style={{ height: 44, padding: "0 16px", borderRadius: 22, background: "rgba(255,255,255,0.16)", fontSize: 14, fontWeight: 600 }}
        >
          Change
        </button>
      </div>
      <div style={{ height: 70 }} aria-hidden="true" />

      <Sheet open={pick} title="Add to which meal?" onClose={() => setPick(false)}>
        <MealPicker
          value={meal}
          onChange={(m) => {
            setMeal(m);
            setPick(false);
          }}
        />
      </Sheet>
    </Shell>
  );
}
