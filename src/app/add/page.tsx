"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import BarcodeScanner from "@/components/BarcodeScanner";
import Icon from "@/components/Icon";
import { ItemEditor, Toggle, draftValid, fromDraft, nutritionOf, toDraft, type Draft } from "@/components/ui";
import { defaultMeal, emptyDraft, fromKey, kcal, todayKey, uid } from "@/lib/nutrition";
import { lookupBarcode } from "@/lib/openfoodfacts";
import { isModelDownloaded, parseOnDevice, webgpuAvailable } from "@/lib/ondevice";
import { parseWithChrome } from "@/lib/chromeai";
import { getGeminiKey, parseWithGemini } from "@/lib/gemini";
import type { ParsedItem } from "@/lib/describe";
import type { Entry, FoodDraft, Preset, Source } from "@/lib/types";

type View = "menu" | "presets" | "barcode" | "describe" | "review";

const EXAMPLES = ["2 rotis and a bowl of dal", "a plate of chicken biryani", "black coffee and a banana"];

function parsedToDraft(p: ParsedItem): Draft {
  return toDraft({
    name: p.name,
    serving: p.serving,
    meal: p.meal ?? defaultMeal(),
    calories: p.calories,
    protein: p.protein,
    carbs: p.carbs,
    fat: p.fat,
    fiber: p.fiber,
    sugar: p.sugar,
    sodium: p.sodium,
  });
}

export default function AddPage() {
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();

  const [view, setView] = useState<View>("menu");
  const [returnView, setReturnView] = useState<View>("menu");
  const [query, setQuery] = useState("");

  // single-item review
  const [draft, setDraft] = useState<Draft>(() => toDraft(emptyDraft()));
  const [source, setSource] = useState<Source>("manual");
  const [savePreset, setSavePreset] = useState(false);
  const [saving, setSaving] = useState(false);

  // barcode
  const [code, setCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [barcodeMsg, setBarcodeMsg] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  // describe
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [items, setItems] = useState<Draft[]>([]);

  const date = app.logDate || todayKey();
  const isToday = date === todayKey();

  const known = useMemo(() => {
    const seen = new Set<string>();
    const out: (FoodDraft & { key: string; fromPreset: boolean })[] = [];
    const push = (f: FoodDraft, fromPreset: boolean) => {
      const key = `${f.name.toLowerCase()}|${f.serving.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ ...f, key, fromPreset });
    };
    for (const p of app.presets) push({ ...p, meal: defaultMeal() }, true);
    for (const e of [...app.entries].reverse()) push(e, false);
    return out;
  }, [app.presets, app.entries]);

  if (!ok || !app.profile) return <Splash />;

  const q = query.trim().toLowerCase();
  const results = q ? known.filter((k) => k.name.toLowerCase().includes(q)).slice(0, 8) : [];

  function openReview(d: FoodDraft, src: Source, back: View, offerSave = false) {
    setDraft(toDraft({ ...d, meal: d.meal ?? defaultMeal() }));
    setSource(src);
    setReturnView(back);
    setSavePreset(offerSave);
    setView("review");
  }

  function leave() {
    app.setLogDate("");
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  async function commit(list: { d: FoodDraft; src: Source }[], alsoPreset?: boolean) {
    if (list.length === 0) return;
    setSaving(true);
    try {
      const now = new Date();
      const base = isToday ? now.getTime() : new Date(fromKey(date).setHours(12, 0, 0, 0)).getTime();
      const entries: Entry[] = list.map(({ d, src }, i) => ({
        ...d,
        id: uid(),
        logDate: date,
        loggedAt: new Date(base + i * 1000).toISOString(),
        source: src,
      }));
      await app.addEntries(entries);
      if (alsoPreset) {
        const d = list[0].d;
        const preset: Preset = { id: uid(), name: d.name, serving: d.serving, ...nutritionOf(toDraft(d)) };
        await app.addPreset(preset);
      }
      app.notify(entries.length === 1 ? "Logged" : `Logged ${entries.length} items`);
      app.setLogDate("");
      router.replace(isToday ? "/" : `/day/${date}`);
    } catch {
      setSaving(false);
    }
  }

  async function doLookup(c: string) {
    setLookingUp(true);
    setBarcodeMsg(null);
    setCameraOn(false);
    try {
      const p = await lookupBarcode(c);
      if (!p) {
        setBarcodeMsg(
          "Not in the Open Food Facts database yet — coverage for Indian products is still thin. You can add it manually.",
        );
        return;
      }
      openReview(
        {
          name: p.brand ? `${p.name} · ${p.brand}` : p.name,
          serving: p.serving,
          meal: defaultMeal(),
          calories: p.calories,
          protein: p.protein,
          carbs: p.carbs,
          fat: p.fat,
          fiber: p.fiber,
          sugar: p.sugar,
          sodium: p.sodium,
        },
        "barcode",
        "barcode",
        true,
      );
    } catch (e) {
      setBarcodeMsg(e instanceof Error ? e.message : "Lookup failed. Try again.");
    } finally {
      setLookingUp(false);
    }
  }

  async function parse() {
    setParsing(true);
    setParseError(null);
    try {
      let parsed: ParsedItem[];
      if (app.profile?.aiMode === "chrome") {
        parsed = await parseWithChrome(text.trim());
      } else if (app.profile?.aiMode === "device") {
        if (!webgpuAvailable()) throw new Error("This browser doesn't support WebGPU. Switch to Gemini in AI Food Parsing settings.");
        if (!(await isModelDownloaded())) throw new Error("The on-device model isn't downloaded yet. Download it in AI Food Parsing settings.");
        parsed = await parseOnDevice(text.trim());
      } else {
        if (!getGeminiKey()) throw new Error("Add your own Gemini API key first — it's free from Google AI Studio.");
        parsed = await parseWithGemini(text.trim());
      }
      setItems(parsed.map(parsedToDraft));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Couldn't parse that. Try again.");
    } finally {
      setParsing(false);
    }
  }

  const dateLabel = isToday ? "" : fromKey(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  /* ------------------------------ views ------------------------------ */

  if (view === "review") {
    return (
      <Shell nav={false} narrow>
        <BackHeader
          title="Review & log"
          subtitle={dateLabel ? `Logging to ${dateLabel}` : undefined}
          onBack={() => setView(returnView)}
        />
        <ItemEditor draft={draft} onChange={setDraft} />
        {source !== "preset" && (
          <div className="card sm" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>Save to my presets</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>One-tap access from Log Food next time.</div>
            </div>
            <Toggle on={savePreset} onChange={setSavePreset} label="Save to my presets" />
          </div>
        )}
        <button
          type="button"
          className="btn"
          disabled={!draftValid(draft) || saving}
          onClick={() => commit([{ d: fromDraft(draft), src: source }], savePreset && source !== "preset")}
        >
          {saving ? "Logging…" : "Log item"}
        </button>
      </Shell>
    );
  }

  if (view === "presets") {
    return (
      <Shell nav={false} narrow>
        <BackHeader title="Presets" subtitle="Foods you eat often, one tap to log." onBack={() => setView("menu")} />
        {app.presets.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "30px 22px" }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No presets yet</div>
            <p className="muted" style={{ fontSize: 13.5, margin: "6px 0 0", lineHeight: 1.5 }}>
              Switch on &ldquo;Save to my presets&rdquo; when you log a food and it will show up here.
            </p>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 18px" }}>
            {app.presets.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => openReview({ ...p, meal: defaultMeal() }, "preset", "presets")}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", padding: "12px 0" }}
                >
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{p.name}</span>
                  <span className="muted" style={{ display: "block", fontSize: 12, marginTop: 1 }}>
                    {p.serving} · {kcal(p.calories)} kcal
                  </span>
                </button>
                <button type="button" className="iconbtn" aria-label={`Delete ${p.name}`} onClick={() => app.deletePreset(p.id)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  if (view === "barcode") {
    return (
      <Shell nav={false} narrow>
        <BackHeader title="Barcode" subtitle="Packaged food, looked up instantly." onBack={() => { setCameraOn(false); setView("menu"); }} />
        {cameraOn ? (
          <BarcodeScanner onDetect={(c) => { setCode(c); doLookup(c); }} />
        ) : (
          <button
            type="button"
            className="card"
            onClick={() => setCameraOn(true)}
            style={{ aspectRatio: "4 / 3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            <Icon name="camera" size={34} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Point your camera at a barcode</span>
            <span className="muted" style={{ fontSize: 12.5 }}>Tap to start the camera</span>
          </button>
        )}
        <div className="label" style={{ textAlign: "center" }}>or enter manually</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="8901063010123"
            aria-label="Barcode number"
          />
          <button
            type="button"
            className="btn"
            style={{ width: "auto", flexShrink: 0 }}
            disabled={code.replace(/\D/g, "").length < 6 || lookingUp}
            onClick={() => doLookup(code)}
          >
            {lookingUp ? "…" : "Look up"}
          </button>
        </div>
        {barcodeMsg && (
          <div className="card sm" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>
            {barcodeMsg}
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="chip on"
                onClick={() => openReview(emptyDraft(), "manual", "barcode")}
              >
                Add it manually
              </button>
            </div>
          </div>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
          Indian products use the same barcode format as everywhere else — coverage on Open Food Facts is just thinner, so a manual
          retry here is normal.
        </p>
      </Shell>
    );
  }

  if (view === "describe") {
    const aiMode = app.profile.aiMode;
    const deviceMode = aiMode === "device" || aiMode === "chrome";
    return (
      <Shell nav={false} narrow>
        <BackHeader title="Describe" subtitle={dateLabel ? `Logging to ${dateLabel}` : "Say what you ate, in plain English."} onBack={() => setView("menu")} />
        <textarea
          className="input"
          value={text}
          maxLength={600}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 2 rotis and a bowl of dal"
          aria-label="What did you eat?"
        />
        <div className="scroll-x">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => setText(ex)}>
              {ex}
            </button>
          ))}
        </div>
        <button type="button" className="btn" disabled={text.trim().length < 2 || parsing} onClick={parse}>
          <Icon name="sparkles" size={18} />
          {parsing ? (deviceMode ? "Thinking on your device…" : "Parsing…") : "Parse with AI"}
        </button>
        <div className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={deviceMode ? "cpu" : "cloud"} size={14} />
          {aiMode === "chrome" ? "Chrome built-in AI, on this device" : aiMode === "device" ? "Running on this device" : "Gemini (your key)"} ·{" "}
          <Link href="/settings/ai" style={{ textDecoration: "underline" }}>
            change
          </Link>
        </div>
        {parseError && (
          <div role="alert" className="card sm" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--danger)" }}>
            {parseError}
            {!deviceMode && !getGeminiKey() && (
              <div style={{ marginTop: 10 }}>
                <Link href="/settings/ai" className="chip on">Add Gemini key</Link>
              </div>
            )}
          </div>
        )}
        {items.length > 0 && (
          <>
            <div className="label">Review &amp; edit</div>
            {items.map((it, i) => (
              <div key={i} className="card" style={{ position: "relative", padding: "52px 18px 18px" }}>
                <button
                  type="button"
                  className="iconbtn"
                  aria-label={`Remove ${it.name || "item"}`}
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30 }}
                >
                  <Icon name="x" size={15} />
                </button>
                <ItemEditor draft={it} onChange={(d) => setItems(items.map((x, j) => (j === i ? d : x)))} />
              </div>
            ))}
            <button type="button" className="btn ghost" onClick={() => setItems([...items, toDraft(emptyDraft())])}>
              <Icon name="plus" size={18} /> Add another
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving || items.length === 0 || !items.every(draftValid)}
              onClick={() => commit(items.map((d) => ({ d: fromDraft(d), src: "describe" as Source })))}
            >
              {saving ? "Logging…" : `Log ${items.length} item${items.length === 1 ? "" : "s"}`}
            </button>
          </>
        )}
      </Shell>
    );
  }

  /* ------------------------------ menu ------------------------------ */
  return (
    <Shell nav={false} narrow>
      <BackHeader
        title="Log Food"
        subtitle={dateLabel ? `Logging to ${dateLabel}` : undefined}
        onBack={leave}
      />
      <div style={{ position: "relative" }}>
        <Icon
          name="search"
          size={18}
          style={{ position: "absolute", left: 14, top: 14, color: "var(--ink-3)", pointerEvents: "none" }}
        />
        <input
          className="input"
          style={{ paddingLeft: 42 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your foods"
          aria-label="Search your foods"
        />
      </div>

      {q ? (
        <div className="card" style={{ padding: "8px 18px", display: "flex", flexDirection: "column" }}>
          {results.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => openReview({ ...r, meal: defaultMeal() }, r.fromPreset ? "preset" : "manual", "menu")}
              style={{ textAlign: "left", padding: "12px 0", borderBottom: "1px solid var(--hair)" }}
            >
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{r.name}</span>
              <span className="muted" style={{ display: "block", fontSize: 12, marginTop: 1 }}>
                {r.serving} · {kcal(r.calories)} kcal
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => openReview({ ...emptyDraft(), name: query.trim() }, "manual", "menu")}
            style={{ textAlign: "left", padding: "12px 0", fontSize: 14.5, color: "var(--ink-2)" }}
          >
            Add &ldquo;{query.trim()}&rdquo; manually
          </button>
        </div>
      ) : (
        <>
          <div className="grid3">
            {(
              [
                { id: "presets" as const, icon: "bookmark" as const, label: "Presets" },
                { id: "barcode" as const, icon: "barcode" as const, label: "Barcode" },
                { id: "describe" as const, icon: "sparkles" as const, label: "Describe" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className="card"
                onClick={() => setView(t.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "22px 8px",
                  borderRadius: 22,
                  boxShadow: "none",
                }}
              >
                <Icon name={t.icon} size={26} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn ghost" onClick={() => openReview(emptyDraft(), "manual", "menu")}>
            <Icon name="pencil" size={17} /> Add manually
          </button>
          {known.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="label">Recent foods</div>
              <div className="card" style={{ padding: "6px 18px", display: "flex", flexDirection: "column" }}>
                {known.slice(0, 6).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => openReview({ ...r, meal: defaultMeal() }, r.fromPreset ? "preset" : "manual", "menu")}
                    style={{ textAlign: "left", padding: "12px 0", borderBottom: "1px solid var(--hair)" }}
                  >
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{r.name}</span>
                    <span className="muted" style={{ display: "block", fontSize: 12, marginTop: 1 }}>
                      {r.serving} · {kcal(r.calories)} kcal
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}
