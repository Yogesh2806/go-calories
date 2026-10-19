"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import { ItemEditor, MealPicker, Sheet, Toggle, draftValid, fromDraft, toDraft, type Draft } from "@/components/ui";
import { defaultMeal, foodKey, formatTime, fromKey, kcal, sum, todayKey, uid } from "@/lib/nutrition";
import { aiLabel, parseText } from "@/lib/parse";
import type { ParsedItem } from "@/lib/describe";
import { MEAL_LABEL, type Entry, type Meal, type Nutrition, type Preset } from "@/lib/types";

/** One line of "What I found". `base` is the nutrition for one serving as the AI (or a saved meal) gave it. */
interface Row {
  id: string;
  key: string;
  name: string;
  serving: string;
  meal: Meal | null;
  base: Nutrition;
  basis: string;
  factor: number;
  locked: boolean;
  fromPreset: boolean;
}

const NUTRIENTS: (keyof Nutrition)[] = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"];
const scaled = (r: Row): Nutrition =>
  Object.fromEntries(NUTRIENTS.map((k) => [k, Math.round(r.base[k] * r.factor * 10) / 10])) as unknown as Nutrition;
const servingOf = (r: Row) => (r.factor === 1 ? r.serving : `${Math.round(r.factor * 100) / 100} × ${r.serving}`);

function nutritionOf(p: ParsedItem | Preset): Nutrition {
  return { calories: p.calories, protein: p.protein, carbs: p.carbs, fat: p.fat, fiber: p.fiber, sugar: p.sugar, sodium: p.sodium };
}

export default function WritePage() {
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<Meal>(() => defaultMeal());
  const [mealChosen, setMealChosen] = useState(false);
  const [pickMeal, setPickMeal] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMeal, setSaveMeal] = useState(false);
  const [mealName, setMealName] = useState("");

  const reqId = useRef(0);
  const readText = useRef("");
  const area = useRef<HTMLTextAreaElement>(null);
  const rowsRef = useRef<Row[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const date = app.logDate || todayKey();
  const isToday = date === todayKey();
  const aiMode = app.profile?.aiMode ?? "cloud";
  const presets = app.presets;

  useEffect(() => {
    if (ok) area.current?.focus();
  }, [ok]);

  async function read(t: string) {
    const id = ++reqId.current;
    setError(null);
    setReading(true);
    try {
      const parsed = await parseText(aiMode, t);
      if (id !== reqId.current) return; // typed more since — a newer read is coming
      readText.current = t;
      const prev = new Map(rowsRef.current.map((r) => [r.key, r]));
      const next: Row[] = parsed.map((p) => {
        const key = foodKey(p.name, p.serving);
        const kept = prev.get(key);
        if (kept) return kept; // keep portion tweaks / locks the person already made
        const saved = presets.find((s) => foodKey(s.name, s.serving) === key);
        if (saved) {
          return {
            id: uid(), key, name: saved.name, serving: saved.serving, meal: p.meal, base: nutritionOf(saved),
            basis: "From your saved meals — you locked this estimate earlier.", factor: 1, locked: true, fromPreset: true,
          };
        }
        return {
          id: uid(), key, name: p.name, serving: p.serving, meal: p.meal, base: nutritionOf(p), basis: p.basis,
          factor: 1, locked: false, fromPreset: false,
        };
      });
      setRows(next);
      if (!mealChosen) {
        const hint = parsed.find((p) => p.meal)?.meal;
        if (hint) setMeal(hint);
      }
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

  const total = useMemo(() => rows.reduce((s, r) => s + scaled(r).calories, 0), [rows]);
  const open = rows.find((r) => r.id === openRow) ?? null;

  if (!ok || !app.profile) return <Splash />;

  const dateLabel = isToday ? "" : fromKey(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const paper = app.profile.style === "paper";
  const canLog = rows.length > 0 && !reading && !saving && rows.every((r) => r.name && scaled(r).calories > 0);

  function leave() {
    app.setLogDate("");
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  async function log() {
    if (!canLog) return;
    setSaving(true);
    try {
      const now = new Date();
      const base = isToday ? now.getTime() : new Date(fromKey(date).setHours(12, 0, 0, 0)).getTime();
      const entries: Entry[] = rows.map((r, i) => ({
        id: uid(),
        logDate: date,
        loggedAt: new Date(base + i * 1000).toISOString(),
        source: "describe",
        name: r.name,
        serving: servingOf(r),
        meal: mealChosen ? meal : (r.meal ?? meal),
        ...scaled(r),
      }));
      await app.addEntries(entries);
      for (const r of rows.filter((x) => x.locked && !x.fromPreset)) {
        const preset: Preset = { id: uid(), name: r.name, serving: r.serving, ...r.base };
        await app.addPreset(preset);
      }
      const ids = entries.map((e) => e.id);
      app.notify(entries.length === 1 ? "Logged 1 item" : `Logged ${entries.length} items`, {
        label: "Undo",
        run: () => void Promise.all(ids.map((id) => app.deleteEntry(id))),
      });
      app.setLogDate("");
      router.replace(isToday ? "/" : `/day/${date}`);
    } catch {
      setSaving(false);
    }
  }

  const patch = (id: string, f: (r: Row) => Row) => setRows((rs) => rs.map((r) => (r.id === id ? f(r) : r)));

  const pending = reading && rows.length === 0;

  return (
    <Shell nav={false} narrow>
      <BackHeader
        title="Write a meal"
        subtitle={dateLabel ? `Logging to ${dateLabel}` : undefined}
        onBack={leave}
        right={
          <button type="button" className="btn" style={{ width: "auto", minHeight: 44, padding: "0 20px", fontSize: 15 }} disabled={!canLog} onClick={log}>
            {saving ? "Logging…" : rows.length > 0 ? `Log ${rows.length} item${rows.length === 1 ? "" : "s"}` : "Log"}
          </button>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="pill" onClick={() => setPickMeal(true)} aria-label="Change meal">
          <Icon name="pencil" size={14} stroke={2} />
          {MEAL_LABEL[meal]} · {formatTime(new Date().toISOString())}
        </button>
        <span className="muted" style={{ fontSize: 12.5 }}>{mealChosen ? "you picked this" : "picked from your note and the time"}</span>
      </div>

      {paper ? (
        <textarea
          ref={area}
          className="note"
          value={text}
          maxLength={600}
          onChange={(e) => setText(e.target.value)}
          placeholder="2 dosa with sambar, a glass of buttermilk and one banana"
          aria-label="What did you eat?"
        />
      ) : (
        <div className="card" style={{ padding: "14px 18px", borderRadius: 26 }}>
          <textarea
            ref={area}
            className="note"
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            placeholder="2 dosa with sambar, a glass of buttermilk and one banana"
            aria-label="What did you eat?"
          />
        </div>
      )}

      {error && (
        <div role="alert" className="card sm" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--danger)" }}>
          {error}
          {/key|Gemini|download/i.test(error) && (
            <div style={{ marginTop: 10 }}>
              <Link href="/settings/ai" className="chip on">
                AI settings
              </Link>
            </div>
          )}
        </div>
      )}

      {(rows.length > 0 || pending) && (
        <div className="sec" style={{ paddingBottom: paper ? 0 : 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="label">What I found</span>
            {reading && (
              <span className="muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <Icon name="sparkles" size={14} /> Reading your note…
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, opacity: reading && rows.length > 0 ? 0.55 : 1, transition: "opacity .15s" }}>
            {pending && (
              <>
                {[0, 1].map((i) => (
                  <div key={i} className="line">
                    <span style={{ flex: 1 }}>
                      <span className="skel" style={{ width: 120, height: 14 }} />
                      <span className="skel" style={{ width: 80, height: 11, marginTop: 8 }} />
                    </span>
                    <span className="skel" style={{ width: 38, height: 14 }} />
                  </div>
                ))}
              </>
            )}
            {rows.map((r) => (
              <button key={r.id} type="button" className="line" onClick={() => setOpenRow(r.id)} aria-label={`How ${r.name} was worked out`}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="line-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {r.name}
                    {r.locked && <Icon name="lock" size={13} style={{ color: "var(--ink-3)" }} />}
                  </span>
                  <span className="line-sub">{servingOf(r)}</span>
                </span>
                <span className="line-kcal">{kcal(scaled(r).calories)}</span>
                <Icon name="chevR" size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
          {rows.length > 0 && (
            <div className="found-total">
              <span style={{ fontSize: 14, color: "var(--ink-2)" }}>Total so far</span>
              <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{kcal(total)} kcal</span>
            </div>
          )}
        </div>
      )}

      {rows.length === 0 && !pending && !error && (
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
          Write it like a note — the calories fill in as you go. Tap any line afterwards to see how it was worked out.
        </p>
      )}

      {rows.length > 0 && !reading && (
        <button
          type="button"
          className="btn ghost"
          style={{ minHeight: 46 }}
          onClick={() => {
            setMealName("");
            setSaveMeal(true);
          }}
        >
          <Icon name="bookmark" size={17} /> Save as a meal
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="sparkles" size={14} /> {aiLabel(aiMode)} ·{" "}
          <Link href="/settings/ai" style={{ textDecoration: "underline" }}>
            change
          </Link>
        </div>
        <div className="muted" style={{ fontSize: 12.5, display: "flex", gap: 16 }}>
          <Link href="/saved" style={{ textDecoration: "underline" }}>Saved meals</Link>
          <Link href="/add" style={{ textDecoration: "underline" }}>Barcode, search &amp; manual</Link>
        </div>
      </div>

      <Sheet open={pickMeal} title="Which meal?" onClose={() => setPickMeal(false)}>
        <MealPicker
          value={meal}
          onChange={(m) => {
            setMeal(m);
            setMealChosen(true);
            setPickMeal(false);
          }}
        />
      </Sheet>

      <Sheet open={saveMeal} title="Save as a meal" onClose={() => setSaveMeal(false)}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
          Keeps everything you wrote as one saved meal ({kcal(total)} kcal) you can add again in one tap.
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

      <Sheet open={!!open} title={open?.name ?? ""} onClose={() => setOpenRow(null)}>
        {open && <Thinking key={open.id} row={open} onPatch={(f) => patch(open.id, f)} />}
      </Sheet>
    </Shell>
  );
}

/** "How I got this" — the thought-process sheet: portion stepper, the reasoning, lock, and manual edit. */
function Thinking({ row, onPatch }: { row: Row; onPatch: (f: (r: Row) => Row) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft({ name: row.name, serving: row.serving, meal: "snacks", ...scaled(row) }));
  const n = scaled(row);
  const step = (d: number) => onPatch((r) => ({ ...r, factor: Math.min(8, Math.max(0.25, Math.round((r.factor + d) * 100) / 100)) }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="display" style={{ fontSize: 54, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>{kcal(n.calories)}</span>
          <span className="muted" style={{ fontSize: 14 }}>kcal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" className="iconbtn" style={{ width: 40, height: 40 }} aria-label="Smaller portion" onClick={() => step(-0.25)}>
            <Icon name="minus" size={18} />
          </button>
          <span style={{ minWidth: 56, textAlign: "center", fontSize: 14.5, fontWeight: 600 }}>×{Math.round(row.factor * 100) / 100}</span>
          <button type="button" className="iconbtn" style={{ width: 40, height: 40 }} aria-label="Bigger portion" onClick={() => step(0.25)}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          ["Protein", n.protein, "var(--c-protein)"],
          ["Carbs", n.carbs, "var(--c-carbs)"],
          ["Fat", n.fat, "var(--c-fat)"],
        ].map(([l, v, c]) => (
          <span key={String(l)} className="pill" style={{ color: "var(--ink)" }}>
            <i style={{ width: 8, height: 8, borderRadius: 4, background: String(c) }} />
            {l} {Math.round(Number(v) * 10) / 10} g
          </span>
        ))}
      </div>

      <div>
        <div className="step">
          <span className="num">1</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>What I read in your note</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              “{row.name}” — {row.serving}
            </div>
          </div>
        </div>
        <div className="step">
          <span className="num">2</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>How I got the number</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
              {row.basis || "Estimated from typical values for this food. It's a best guess, so adjust the portion or the numbers if yours differs."}
            </div>
          </div>
        </div>
        <div className="step">
          <span className="num">3</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Your portion</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              {row.factor === 1 ? "One serving, as written." : `${Math.round(row.factor * 100) / 100} × the serving above.`}
            </div>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{kcal(n.calories)}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
        <span className="pill" style={{ width: 36, height: 36, padding: 0, justifyContent: "center", borderRadius: 18 }}>
          <Icon name="lock" size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Lock this estimate</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>
            {row.fromPreset ? "Already in your saved meals." : `“${row.name}, ${row.serving}” will always be ${kcal(row.base.calories)} kcal.`}
          </div>
        </div>
        {!row.fromPreset && <Toggle on={row.locked} onChange={(v) => onPatch((r) => ({ ...r, locked: v }))} label="Lock this estimate" />}
      </div>

      {editing ? (
        <>
          <ItemEditor draft={draft} onChange={setDraft} showMeal={false} />
          <button
            type="button"
            className="btn"
            disabled={!draftValid(draft)}
            onClick={() => {
              const f = fromDraft(draft);
              onPatch((r) => ({
                ...r,
                name: f.name,
                serving: f.serving,
                factor: 1,
                key: foodKey(f.name, f.serving),
                base: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, sodium: f.sodium },
                basis: "You edited these numbers by hand.",
              }));
              setEditing(false);
            }}
          >
            Save numbers
          </button>
        </>
      ) : (
        <button type="button" className="btn ghost" onClick={() => setEditing(true)}>
          <Icon name="pencil" size={17} /> Edit the numbers
        </button>
      )}
    </>
  );
}
