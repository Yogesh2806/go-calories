"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app";
import Shell from "@/components/Shell";
import Icon from "@/components/Icon";
import GoalBlock from "@/components/GoalBlock";
import WeekStrip from "@/components/WeekStrip";
import EntrySheet from "@/components/EntrySheet";
import Thinking from "@/components/Thinking";
import { MealPicker, Sheet } from "@/components/ui";
import {
  byDay,
  defaultMeal,
  foodKey,
  formatTime,
  fromKey,
  goalsFor,
  groupByMeal,
  kcal,
  streakInfo,
  sum,
  todayKey,
  uid,
} from "@/lib/nutrition";
import { dismissReminder, dueReminder, loadReminders } from "@/lib/reminders";
import { inlineText, splitMeals } from "@/lib/note";
import { aiLabel, effectiveMode, parseText } from "@/lib/parse";
import { nutritionOf, scaled, servingOf, type Row } from "@/lib/noterows";
import type { ParsedItem } from "@/lib/describe";
import { MEAL_LABEL, type Entry, type Meal, type Preset, type Profile } from "@/lib/types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The food journal for one day: week strip, the day's note with a calorie pill after every item, and a place to keep typing. */
export default function Journal({ date, profile, banner }: { date: string; profile: Profile; banner?: ReactNode }) {
  const app = useApp();
  const today = todayKey();
  const isToday = date === today;
  const paper = profile.style === "paper";
  const goals = goalsFor(profile);
  const aiMode = effectiveMode(profile.aiMode);

  const [text, setText] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [pickGroup, setPickGroup] = useState<Meal | null>(null);
  const [wantCommit, setWantCommit] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [saveMeal, setSaveMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [nudgeTick, setNudgeTick] = useState(0);
  const [due, setDue] = useState<ReturnType<typeof dueReminder>>(null);

  const area = useRef<HTMLTextAreaElement>(null);
  const draftBox = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const readText = useRef("");
  const rowsRef = useRef<Row[]>([]);
  const cache = useRef(new Map<string, ParsedItem[]>());
  const busy = useRef(false);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const { dayEntries, totals, kcalByDay, streak } = useMemo(() => {
    const m = new Map<string, number>();
    byDay(app.entries).forEach((es, k) => m.set(k, sum(es).calories));
    const de = app.entries.filter((e) => e.logDate === date);
    return { dayEntries: de, totals: sum(de), kcalByDay: m, streak: streakInfo(app.entries) };
  }, [app.entries, date]);
  const groups = useMemo(() => groupByMeal(dayEntries), [dayEntries]);

  // Reminders live on this device; read them after mount so the server and first client render agree.
  useEffect(() => {
    if (isToday) setDue(dueReminder(dayEntries, loadReminders()));
  }, [isToday, dayEntries, nudgeTick]);

  // Cursor ready on today's note.
  useEffect(() => {
    if (isToday) area.current?.focus({ preventScroll: true });
  }, [isToday]);

  // Keep what is being typed on this device, so a reload (the browser reclaiming memory, a crash) never loses it.
  const draftKey = `gc:draft:${date}`;
  useEffect(() => {
    setDraftReady(false);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(draftKey);
    } catch {
      /* ignore */
    }
    setText(saved ?? "");
    setDraftReady(true);
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady) return;
    try {
      if (text.trim()) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  }, [text, draftReady, draftKey]);
  // Size the box to fit a restored draft.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  /* ---------- reading the note ---------- */

  async function read(t: string) {
    const id = ++reqId.current;
    setError(null);
    setReading(true);
    try {
      const fallback = defaultMeal();
      const prev = new Map(rowsRef.current.map((r) => [r.key, r]));
      const out: Row[] = [];
      for (const seg of splitMeals(t)) {
        const ck = `${aiMode}|${seg.text}`;
        let items = cache.current.get(ck);
        if (!items) {
          items = await parseText(aiMode, seg.text);
          if (id !== reqId.current) return; // typed more since: a newer read is coming
          cache.current.set(ck, items);
        }
        for (const p of items) {
          const meal = seg.meal ?? p.meal ?? fallback;
          const key = foodKey(p.name, p.serving);
          const kept = prev.get(key);
          if (kept) {
            out.push({ ...kept, meal }); // keep portion tweaks and locks the person already made
            continue;
          }
          const saved = app.presets.find((s) => foodKey(s.name, s.serving) === key);
          out.push(
            saved
              ? {
                  id: uid(), key, name: saved.name, serving: saved.serving, meal, base: nutritionOf(saved),
                  basis: "From your saved meals. You locked this estimate earlier.", factor: 1, locked: true, fromPreset: true,
                }
              : {
                  id: uid(), key, name: p.name, serving: p.serving, meal, base: nutritionOf(p), basis: p.basis,
                  factor: 1, locked: false, fromPreset: false,
                },
          );
        }
      }
      if (id !== reqId.current) return;
      readText.current = t;
      setRows(out);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "Couldn't read that. Try again.");
    } finally {
      if (id === reqId.current) setReading(false);
    }
  }

  // Read the note a moment after typing stops, so every keystroke doesn't spend an AI call.
  useEffect(() => {
    const t = text.trim();
    if (t.length < 3) {
      reqId.current++;
      readText.current = "";
      setRows([]);
      setReading(false);
      setError(null);
      return;
    }
    if (t === readText.current) return;
    setReading(true);
    const timer = setTimeout(() => void read(t), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, aiMode]);

  /* ---------- adding it to the day ---------- */

  async function commit() {
    const rs = rowsRef.current.filter((r) => r.name && scaled(r).calories > 0);
    if (busy.current || rs.length === 0) return;
    busy.current = true;
    setCommitting(true);
    try {
      const now = new Date();
      const base = isToday ? now.getTime() : new Date(fromKey(date).setHours(12, 0, 0, 0)).getTime();
      const entries: Entry[] = rs.map((r, i) => ({
        id: uid(),
        logDate: date,
        loggedAt: new Date(base + i * 1000).toISOString(),
        source: "describe",
        name: r.name,
        serving: servingOf(r),
        meal: r.meal,
        ...scaled(r),
      }));
      reqId.current++; // drop any read still in flight
      readText.current = "";
      setText("");
      setRows([]);
      setReading(false);
      await app.addEntries(entries);
      for (const r of rs.filter((x) => x.locked && !x.fromPreset)) {
        await app.addPreset({ id: uid(), name: r.name, serving: r.serving, ...r.base });
      }
      const ids = entries.map((e) => e.id);
      app.notify(entries.length === 1 ? "Added 1 item" : `Added ${entries.length} items`, {
        label: "Undo",
        run: () => void Promise.all(ids.map((id) => app.deleteEntry(id))),
      });
    } catch {
      /* addEntries already told the person */
    } finally {
      busy.current = false;
      setCommitting(false);
    }
  }

  // Add the note to the day once it has been read (after Done / leaving the box).
  useEffect(() => {
    if (!wantCommit) return;
    if (reading) return;
    setWantCommit(false);
    if (rows.length > 0) void commit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantCommit, reading, rows]);

  // Leaving the screen with a finished read still waiting: add it rather than lose it.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(
    () => () => {
      if (rowsRef.current.length > 0) void commitRef.current();
    },
    [],
  );

  const patch = (id: string, f: (r: Row) => Row) => setRows((rs) => rs.map((r) => (r.id === id ? f(r) : r)));
  const open = rows.find((r) => r.id === openRow) ?? null;
  const entry = dayEntries.find((e) => e.id === openEntry) ?? null;
  const previewGroups = (["breakfast", "lunch", "snacks", "drinks", "dinner"] as Meal[])
    .map((m) => ({ meal: m, items: rows.filter((r) => r.meal === m) }))
    .filter((g) => g.items.length > 0);
  const previewKcal = rows.reduce((s, r) => s + scaled(r).calories, 0);

  const d = fromKey(date);
  const longDate = d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
  const shortDate = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  const left = goals.calories - totals.calories;
  const status =
    dayEntries.length === 0
      ? "Nothing written yet"
      : totals.calories / goals.calories > 1.05
        ? `${kcal(-left)} over`
        : totals.calories / goals.calories >= 0.8
          ? "On target"
          : `${kcal(left)} to go`;

  const serif = paper ? { fontFamily: "var(--font-display)" } : {};
  const placeholder = dayEntries.length === 0 ? (isToday ? `For ${MEAL_LABEL[defaultMeal()].toLowerCase()}…` : "Write what you ate…") : "Add more…";

  return (
    <Shell composer logDate={date}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link href="/calendar" className="monthlink" aria-label="Open calendar">
          <Icon name="calendar" size={18} stroke={1.8} />
          {MONTHS[d.getMonth()]} {d.getFullYear()}
          <Icon name="chevR" size={14} stroke={2} style={{ color: "var(--ink-3)" }} />
        </Link>
        <Link href="/streaks" className="streak-chip" aria-label={`${streak.current}-day streak`}>
          <Icon name="flame" size={16} stroke={2} />
          <span>{streak.current > 0 ? `${streak.current}-day streak` : "Start a streak"}</span>
        </Link>
      </div>

      <WeekStrip selected={date} today={today} kcalByDay={kcalByDay} goal={goals.calories} />

      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="h1" style={paper ? undefined : { fontSize: 30, letterSpacing: "-0.02em" }}>
            {isToday ? "Today" : shortDate}
          </h1>
          {paper && <Squiggle />}
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {isToday ? `${longDate} · tap anywhere and type` : `${status} · tap to edit`}
          </div>
        </div>
        {!isToday && (
          <Link href="/" className="jump" style={{ marginBottom: 4 }}>
            <Icon name="home" size={15} stroke={2} />
            Jump to today
          </Link>
        )}
      </header>

      {banner}

      <GoalBlock style={profile.style} totals={totals} goals={goals} />

      {due && isToday && (
        <div className="card sm" style={{ display: "flex", alignItems: "center", gap: 12 }} role="status">
          <Icon name="bell" size={18} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
            <b>Time for {due.label.toLowerCase()}?</b>
            <span className="muted"> Nothing written yet.</span>
          </div>
          <button type="button" className="pill" onClick={() => area.current?.focus()}>
            Write it
          </button>
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

      {groups.map((g) => (
        <section key={g.meal} className="sec" aria-label={MEAL_LABEL[g.meal]}>
          <button type="button" className="sec-head sec-btn" onClick={() => setPickGroup(g.meal)} aria-label={`${MEAL_LABEL[g.meal]}, change meal`}>
            <span className="sec-name">{MEAL_LABEL[g.meal]}</span>
            <span className="sec-time">{formatTime(g.items[0].loggedAt)}</span>
            <span className="sec-kcal">
              {kcal(g.kcal)}
              <span className="sec-unit"> kcal</span>
            </span>
          </button>
          <p className="jtext">
            {g.items.map((e, i) => {
              const t = inlineText(e);
              return (
                <Fragment key={e.id}>
                  <span>
                    {t.qty && <u className="jqty">{t.qty}</u>}
                    {t.qty ? " " : ""}
                    {t.name}
                  </span>
                  <button type="button" className="kp" onClick={() => setOpenEntry(e.id)} aria-label={`${e.name}, ${kcal(e.calories)} calories. Open details`}>
                    {kcal(e.calories)}
                  </button>
                  {i < g.items.length - 1 ? ", " : ""}
                </Fragment>
              );
            })}
          </p>
        </section>
      ))}

      <div ref={draftBox} className="note-area" onClick={(ev) => ev.target === ev.currentTarget && area.current?.focus()}>
        <textarea
          ref={area}
          className="note"
          value={text}
          rows={2}
          maxLength={700}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={(e) => {
            // Working in the "how I got this" sheet is not leaving the note.
            if (openRow) return;
            if (text.trim() && !draftBox.current?.contains(e.relatedTarget as Node | null)) setWantCommit(true);
          }}
          placeholder={placeholder}
          aria-label="What did you eat?"
          style={serif}
        />

        {(rows.length > 0 || (reading && text.trim().length >= 3)) && (
          <div className="draft" aria-live="polite">
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-3)", marginBottom: 6 }}>
              <Icon name="sparkles" size={14} />
              <span>{reading ? "Estimating as you pause" : `${kcal(previewKcal)} kcal found`}</span>
              <span style={{ marginLeft: "auto" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: "auto", minHeight: 34, padding: "0 16px", fontSize: 14 }}
                  disabled={reading || rows.length === 0 || committing}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => (reading ? undefined : void commit())}
                >
                  {committing ? "Adding…" : "Done"}
                </button>
              </span>
            </div>
            {previewGroups.map((g) => (
              <div key={g.meal} className="draft-sec">
                <span className="sec-name" style={{ fontSize: paper ? 17 : 13.5 }}>{MEAL_LABEL[g.meal]}</span>
                <p className="jtext" style={{ margin: "2px 0 0" }}>
                  {g.items.map((r, i) => {
                    const t = inlineText({ name: r.name, serving: r.serving });
                    return (
                      <Fragment key={r.id}>
                        <span>
                          {t.qty && <u className="jqty">{t.qty}</u>}
                          {t.qty ? " " : ""}
                          {t.name}
                        </span>
                        <button
                          type="button"
                          className={`kp${r.locked ? " locked" : ""}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setOpenRow(r.id)}
                          aria-label={`How ${r.name} was worked out`}
                        >
                          {kcal(scaled(r).calories)}
                        </button>
                        {i < g.items.length - 1 ? ", " : ""}
                      </Fragment>
                    );
                  })}
                </p>
              </div>
            ))}
            {rows.length > 0 && !reading && (
              <button
                type="button"
                className="linkbtn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setMealName("");
                  setSaveMeal(true);
                }}
              >
                <Icon name="bookmark" size={15} /> Save these as a meal
              </button>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="card sm" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--danger)", marginTop: 10 }}>
            {error}
            {/key|Gemini|download|Chrome|engine|WebGPU/i.test(error) && (
              <div style={{ marginTop: 10 }}>
                <Link href="/settings/ai" className="chip on">
                  AI food parsing settings
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {(dayEntries.length > 0 || rows.length > 0) && (
        <div className="muted" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12.5 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="sparkles" size={14} /> {aiLabel(aiMode)}
          </span>
          <Link href={`/nutrients/${date}`} style={{ textDecoration: "underline" }}>
            Macros &amp; micros →
          </Link>
        </div>
      )}

      <Sheet
        open={!!open}
        title={open?.name ?? ""}
        onClose={() => {
          setOpenRow(null);
          area.current?.focus({ preventScroll: true });
        }}
      >
        {open && <Thinking key={open.id} row={open} onPatch={(f) => patch(open.id, f)} />}
      </Sheet>
      <EntrySheet entry={entry} onClose={() => setOpenEntry(null)} />
      <Sheet open={pickGroup !== null} title="Move this meal to…" onClose={() => setPickGroup(null)}>
        {pickGroup && (
          <MealPicker
            value={pickGroup}
            onChange={async (m) => {
              const from = pickGroup;
              setPickGroup(null);
              if (m === from) return;
              for (const e of dayEntries.filter((x) => x.meal === from)) await app.updateEntry({ ...e, meal: m }).catch(() => {});
            }}
          />
        )}
      </Sheet>
      <Sheet open={saveMeal} title="Save as a meal" onClose={() => setSaveMeal(false)}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
          Keeps everything you wrote as one saved meal ({kcal(previewKcal)} kcal) you can add again in one tap.
        </p>
        <input
          className="input"
          value={mealName}
          maxLength={60}
          autoFocus
          onChange={(e) => setMealName(e.target.value)}
          placeholder="e.g. Usual breakfast"
          aria-label="Meal name"
        />
        <button
          type="button"
          className="btn"
          disabled={mealName.trim().length < 2}
          onClick={async () => {
            const t = sum(rows.map(scaled));
            const preset: Preset = {
              id: uid(),
              name: mealName.trim(),
              serving: rows.map((r) => r.name).join(", ").slice(0, 120),
              calories: Math.round(t.calories),
              protein: Math.round(t.protein * 10) / 10,
              carbs: Math.round(t.carbs * 10) / 10,
              fat: Math.round(t.fat * 10) / 10,
              fiber: Math.round(t.fiber * 10) / 10,
              sugar: Math.round(t.sugar * 10) / 10,
              sodium: Math.round(t.sodium),
            };
            setSaveMeal(false);
            await app.addPreset(preset);
            app.notify(`Saved “${preset.name}”`);
          }}
        >
          Save meal
        </button>
      </Sheet>
    </Shell>
  );
}

/** The hand-drawn underline under the Paper page title. */
function Squiggle() {
  return (
    <svg width="64" height="8" viewBox="0 0 64 8" fill="none" aria-hidden="true" style={{ display: "block", marginTop: 4 }}>
      <path d="M1 5c5-5 9 4 14 0s9-4 14 0 9 4 14 0 9-4 14 0" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
