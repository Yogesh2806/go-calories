"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { Splash } from "@/components/Shell";
import InstallHint from "@/components/InstallHint";
import Icon from "@/components/Icon";
import { Field, NumInput, Sheet, Toggle } from "@/components/ui";
import { ACCENT_COLORS, ACCENT_LABEL, resolveDark } from "@/lib/theme";
import { ACCENT_KEYS, STYLE_LABEL, type Profile, type Sex, type UiStyle } from "@/lib/types";
import { effectiveMode } from "@/lib/parse";
import { formatHeight, formatWeight, goalLabel, goalsFor, num } from "@/lib/nutrition";

type Editing = null | "body";

export default function ProfilePage() {
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);

  if (!ok || !app.profile) return <Splash />;
  const p = app.profile;
  const paper = p.style === "paper";
  const dark = typeof window !== "undefined" && resolveDark(p.theme, p.style);
  const g = goalsFor(p);
  const goalLine =
    p.goal === "maintain"
      ? "Goal · Maintain weight"
      : `Goal · ${goalLabel(p.goal)} → ${formatWeight(p.targetWeightKg, p.units)}`;

  return (
    <Shell narrow>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="h1">Profile</h1>
        <button type="button" className="iconbtn" aria-label="Edit profile" onClick={() => setEditing("body")}>
          <Icon name="pencil" size={17} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            background: "var(--ink)",
            color: "var(--ink-contrast)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          {(p.name || "Y").charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 19, fontWeight: 600 }}>{p.name || "You"}</div>
        <div className="muted" style={{ fontSize: 13 }}>{goalLine}</div>
        {app.user?.email && <div className="muted" style={{ fontSize: 12 }}>{app.user.email}</div>}
      </div>

      <div className="grid2">
        {[
          { icon: "ruler" as const, label: "Height", v: formatHeight(p.heightCm, p.units) },
          { icon: "scale" as const, label: "Weight", v: formatWeight(p.weightKg, p.units) },
          { icon: "user" as const, label: "Age · Sex", v: `${p.age} yrs${p.sex ? ` · ${p.sex === "male" ? "Male" : "Female"}` : ""}` },
          { icon: "target" as const, label: "Goal weight", v: formatWeight(p.targetWeightKg, p.units) },
        ].map((s) => (
          <div key={s.label} className="card sm" style={{ borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Icon name={s.icon} size={18} style={{ color: "var(--ink-2)" }} />
            <div className="muted" style={{ fontSize: 11.5 }}>{s.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Your targets</div>
        <div className="card list">
          <Link href="/targets" className="row">
            <span>Daily targets</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--ink-2)" }}>
              {p.calorieGoal.toLocaleString()} kcal <Icon name="chevR" size={14} />
            </span>
          </Link>
          <div className="row" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            <span>Protein · Carbs · Fat</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {g.protein} · {g.carbs} · {g.fat} g
            </span>
          </div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Protein is {p.proteinPerKg} g per kg of body weight, fat is {p.fatPct}% of calories, and carbs fill the rest.
        </p>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Settings</div>
        <div className="card list">
          <div className="sub" style={{ padding: "14px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 14.5 }}>Style</span>
            <div style={{ display: "flex", gap: 12 }} role="group" aria-label="Style">
              {(["paper", "glass"] as UiStyle[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="style-tile"
                  aria-pressed={p.style === k}
                  onClick={() => app.saveProfile({ style: k })}
                >
                  <StylePreview kind={k} />
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
                    {STYLE_LABEL[k]}
                    {p.style === k && <Icon name="check" size={15} stroke={2.4} />}
                  </span>
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              {paper ? "Warm paper and serif type, like a notebook." : "The original monochrome glass look."} Switches instantly and follows you to your other devices.
            </span>
          </div>
          <div className="row">
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={dark ? "moon" : "sun"} size={18} />
              Appearance
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!paper && (
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                  {p.theme === "system" ? "Auto" : p.theme === "dark" ? "Dark" : "Light"}
                </span>
              )}
              {paper ? (
                <span className="muted" style={{ fontSize: 12.5 }}>Paper is light only for now</span>
              ) : (
                <Toggle
                  label="Dark mode"
                  on={dark}
                  onChange={(v) => app.saveProfile({ theme: v ? "dark" : "light" })}
                />
              )}
            </span>
          </div>
          {!paper && p.theme !== "system" && (
            <button type="button" className="row" style={{ fontSize: 13, color: "var(--ink-3)" }} onClick={() => app.saveProfile({ theme: "system" })}>
              Match my device instead
            </button>
          )}
          {!paper && (
          <div className="sub" style={{ padding: "14px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 14.5 }}>Accent Color</span>
            <div className="scroll-x" style={{ gap: 12, padding: 4 }}>
              {ACCENT_KEYS.map((k) => {
                const on = p.accent === k;
                const c = dark ? ACCENT_COLORS[k].d : ACCENT_COLORS[k].l;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-label={ACCENT_LABEL[k]}
                    aria-pressed={on}
                    onClick={() => app.saveProfile({ accent: k })}
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      background: c,
                      color: dark ? ACCENT_COLORS[k].onD : ACCENT_COLORS[k].onL,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: on ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : "none",
                    }}
                  >
                    {on && <Icon name="check" size={18} stroke={2.4} />}
                  </button>
                );
              })}
            </div>
          </div>
          )}
          <Link href="/streaks" className="row">
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="flame" size={18} />
              Streaks &amp; reminders
            </span>
            <Icon name="chevR" size={14} style={{ color: "var(--ink-2)" }} />
          </Link>
          <Link href="/saved" className="row">
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="bookmark" size={18} />
              Saved meals
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--ink-2)" }}>
              {app.presets.length} <Icon name="chevR" size={14} />
            </span>
          </Link>
          <Link href="/settings/ai" className="row">
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="sparkles" size={18} />
              AI Food Parsing
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--ink-2)" }}>
              {(() => { const m = effectiveMode(p.aiMode); return m === "chrome" ? "Chrome AI" : m === "device" ? "On-device" : "Gemini"; })()} <Icon name="chevR" size={14} />
            </span>
          </Link>
          <button
            type="button"
            className="row"
            onClick={() => app.saveProfile({ units: p.units === "metric" ? "imperial" : "metric" })}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="ruler" size={18} />
              Units
            </span>
            <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{p.units === "metric" ? "Metric" : "Imperial"}</span>
          </button>
          <InstallHint compact />
          <button
            type="button"
            className="row"
            style={{ color: "var(--ink-2)" }}
            onClick={async () => {
              await app.signOut();
              router.replace("/login");
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="logout" size={18} />
              Sign Out
            </span>
          </button>
        </div>
        {app.mode === "local" && (
          <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
            You&apos;re using Go Calories without an account — your log lives on this device only. Signing out keeps it here, but clearing browser data will erase it.
          </p>
        )}
      </section>

      <BodySheet open={editing === "body"} profile={p} onClose={() => setEditing(null)} onSave={(patch) => app.saveProfile(patch)} />
    </Shell>
  );
}

interface SheetProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (patch: Partial<Profile>) => Promise<void>;
}

function BodySheet({ open, profile, onClose, onSave }: SheetProps) {
  // Re-mount the form each time it opens so it starts from the saved values.
  return (
    <Sheet open={open} title="Edit profile" onClose={onClose}>
      <BodyForm profile={profile} onClose={onClose} onSave={onSave} />
    </Sheet>
  );
}
function BodyForm({ profile, onClose, onSave }: Omit<SheetProps, "open">) {
  const [name, setName] = useState(profile.name);
  const [h, setH] = useState(String(profile.heightCm));
  const [w, setW] = useState(String(profile.weightKg));
  const [a, setA] = useState(String(profile.age));
  const [t, setT] = useState(String(profile.targetWeightKg));
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const valid = num(h) >= 100 && num(w) >= 25 && num(a) >= 10 && num(t) >= 25;
  return (
    <>
      <Field label="NAME">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="SEX (USED IN THE CALORIE FORMULA)">
        <div className="seg" role="radiogroup" aria-label="Sex">
          {(["male", "female"] as Sex[]).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={sex === x} className={sex === x ? "on" : ""} onClick={() => setSex(x)}>
              {x === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid2">
        <Field label="HEIGHT (CM)">
          <NumInput value={h} onChange={setH} />
        </Field>
        <Field label="WEIGHT (KG)">
          <NumInput value={w} onChange={setW} />
        </Field>
        <Field label="AGE (YRS)">
          <NumInput value={a} onChange={setA} step="1" />
        </Field>
        <Field label="GOAL WEIGHT (KG)">
          <NumInput value={t} onChange={setT} />
        </Field>
      </div>
      <button
        type="button"
        className="btn"
        disabled={!valid}
        onClick={async () => {
          await onSave({ name: name.trim(), heightCm: num(h), weightKg: num(w), age: Math.round(num(a)), targetWeightKg: num(t), sex });
          onClose();
        }}
      >
        Save
      </button>
    </>
  );
}

/** A tiny drawing of each style, so the choice is visual. */
function StylePreview({ kind }: { kind: UiStyle }) {
  const paper = kind === "paper";
  return (
    <div
      aria-hidden="true"
      style={{
        height: 92,
        borderRadius: 12,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: paper ? "#F6F1E7" : "#FBFBFA",
        border: "1px solid rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "hidden",
        color: paper ? "#2A2520" : "#121212",
      }}
    >
      <div style={{ fontFamily: paper ? "Georgia, 'Times New Roman', serif" : "inherit", fontSize: 17, fontWeight: paper ? 500 : 700, lineHeight: 1 }}>Today</div>
      <div style={{ height: 5, borderRadius: 3, background: paper ? "#E4D9C4" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ width: "55%", height: "100%", background: paper ? "#C2650F" : "#121212" }} />
      </div>
      {paper ? (
        <>
          <div style={{ borderBottom: "1.5px solid #2A2520", height: 1, marginTop: 2 }} />
          <div style={{ borderBottom: "1px dashed rgba(42,37,32,0.3)", height: 1, marginTop: 4 }} />
        </>
      ) : (
        <div style={{ height: 22, borderRadius: 9, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.06)", marginTop: 2 }} />
      )}
      {!paper && (
        <div style={{ position: "absolute", left: "50%", bottom: 6, transform: "translateX(-50%)", width: 44, height: 12, borderRadius: 6, background: "rgba(20,20,22,0.85)" }} />
      )}
    </div>
  );
}
