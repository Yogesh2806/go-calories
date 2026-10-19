"use client";

import Link from "next/link";
import Icon from "./Icon";
import { MealPicker, Sheet } from "./ui";
import { useApp } from "@/lib/app";
import { formatTime, kcal } from "@/lib/nutrition";
import { MEAL_LABEL, type Entry } from "@/lib/types";

/** Opens when you tap a calorie pill in the note: the numbers, which meal it belongs to, edit or remove. */
export default function EntrySheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const app = useApp();

  async function remove(e: Entry) {
    const gone = { ...e };
    onClose();
    try {
      await app.deleteEntry(e.id);
      app.notify(`Removed ${gone.name}`, { label: "Undo", run: () => void app.addEntries([gone]) });
    } catch {
      /* deleteEntry already showed the error */
    }
  }

  return (
    <Sheet open={!!entry} title={entry?.name ?? ""} onClose={onClose}>
      {entry && (
        <>
          <div className="muted" style={{ marginTop: -8, fontSize: 13 }}>
            {entry.serving} · {MEAL_LABEL[entry.meal]} · {formatTime(entry.loggedAt)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="display" style={{ fontSize: 54, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {kcal(entry.calories)}
            </span>
            <span className="muted" style={{ fontSize: 14 }}>kcal</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["Protein", entry.protein, "var(--c-protein)"],
              ["Carbs", entry.carbs, "var(--c-carbs)"],
              ["Fat", entry.fat, "var(--c-fat)"],
            ].map(([l, v, c]) => (
              <span key={String(l)} className="pill" style={{ color: "var(--ink)" }}>
                <i style={{ width: 8, height: 8, borderRadius: 4, background: String(c) }} />
                {l} {Math.round(Number(v) * 10) / 10} g
              </span>
            ))}
          </div>
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Which meal</div>
            <MealPicker value={entry.meal} onChange={(m) => void app.updateEntry({ ...entry, meal: m }).then(onClose, () => {})} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/edit/${entry.id}`} className="btn ghost" style={{ flex: 1 }}>
              <Icon name="pencil" size={17} /> Edit numbers
            </Link>
            <button type="button" className="btn danger" style={{ flex: 1 }} onClick={() => void remove(entry)}>
              <Icon name="trash" size={17} /> Remove
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
