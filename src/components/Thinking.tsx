"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { ItemEditor, Toggle, draftValid, fromDraft, toDraft, type Draft } from "@/components/ui";
import { foodKey, kcal } from "@/lib/nutrition";
import { scaled, type Row } from "@/lib/noterows";

/** "How I got this" — the thought-process sheet: portion stepper, the reasoning, lock, and manual edit. */
export default function Thinking({ row, onPatch }: { row: Row; onPatch: (f: (r: Row) => Row) => void }) {
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
