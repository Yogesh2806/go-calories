"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import {
  ON_DEVICE_LABEL,
  ON_DEVICE_SIZE_NOTE,
  deleteModel,
  isModelDownloaded,
  loadModel,
  webgpuAvailable,
} from "@/lib/ondevice";
import {
  DEFAULT_GEMINI_MODEL,
  clearGeminiKey,
  getGeminiKey,
  getGeminiModel,
  maskKey,
  parseWithGemini,
  setGeminiKey,
  setGeminiModel,
} from "@/lib/gemini";
import type { AiMode } from "@/lib/types";

export default function AiSettings() {
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();
  const [gpu, setGpu] = useState<boolean | null>(null);
  const [downloaded, setDownloaded] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Gemini key (stored in this browser only)
  const [savedKey, setSavedKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [testing, setTesting] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setSavedKey(getGeminiKey());
    setModel(getGeminiModel());
    setGpu(webgpuAvailable());
    isModelDownloaded().then(setDownloaded);
  }, []);

  if (!ok || !app.profile) return <Splash />;
  const mode = app.profile.aiMode;
  const pick = (m: AiMode) => app.saveProfile({ aiMode: m });

  async function download() {
    setError(null);
    setProgress(0);
    setStatus("Starting…");
    try {
      await loadModel((p, t) => {
        setProgress(p);
        setStatus(t);
      });
      setDownloaded(true);
      await pick("device");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The download failed. Check your connection and try again.");
    } finally {
      setProgress(null);
    }
  }

  async function saveKey() {
    const k = keyInput.trim();
    if (!k) return;
    setTesting(true);
    setKeyMsg(null);
    try {
      await parseWithGemini("one banana", k, model.trim() || DEFAULT_GEMINI_MODEL);
      setGeminiKey(k);
      setGeminiModel(model);
      setSavedKey(k);
      setKeyInput("");
      setKeyMsg({ ok: true, text: "Key works and is saved on this device." });
      await pick("cloud");
    } catch (e) {
      setKeyMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't verify that key." });
    } finally {
      setTesting(false);
    }
  }

  function removeKey() {
    clearGeminiKey();
    setSavedKey("");
    setKeyMsg({ ok: true, text: "Key removed from this device." });
  }

  async function remove() {
    setError(null);
    try {
      await deleteModel();
      setDownloaded(false);
      if (mode === "device") await pick("cloud");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the model.");
    }
  }

  const option = (m: AiMode, icon: "cloud" | "cpu", title: string, desc: string) => {
    const on = mode === m;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => pick(m)}
        className="card"
        style={{
          textAlign: "left",
          display: "flex",
          gap: 14,
          alignItems: "center",
          padding: "16px 18px",
          borderRadius: 20,
          boxShadow: "none",
          background: on ? "var(--ink)" : undefined,
          color: on ? "var(--ink-contrast)" : undefined,
        }}
      >
        <Icon name={icon} size={22} />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 15.5, fontWeight: 600 }}>{title}</span>
          <span style={{ display: "block", fontSize: 12.5, opacity: 0.72, marginTop: 2, lineHeight: 1.4 }}>{desc}</span>
        </span>
        {on && <Icon name="check" size={20} />}
      </button>
    );
  };

  return (
    <Shell nav={false} narrow>
      <BackHeader title="AI Food Parsing" onBack={() => (window.history.length > 1 ? router.back() : router.push("/profile"))} />
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        &ldquo;Describe&rdquo; turns plain text like &ldquo;2 rotis and a bowl of dal&rdquo; into calories and macros. Choose where that
        thinking happens.
      </p>

      <div role="radiogroup" aria-label="AI mode" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {option("cloud", "cloud", "Gemini (your own key)", "Fast and accurate. You paste your own free Google API key; your descriptions go from this device straight to Google.")}
        {option("device", "cpu", "On-device (experimental)", "Private and works offline after a one-time download. Slower and less accurate than the cloud.")}
      </div>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="label">Gemini API key</div>
        {savedKey && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink-2)" }}>
              <Icon name="check" size={18} /> Key saved · {maskKey(savedKey)}
            </span>
            <button type="button" className="chip" onClick={removeKey}>
              Remove
            </button>
          </div>
        )}
        <div className="field">
          <span>{savedKey ? "REPLACE KEY" : "PASTE YOUR KEY"}</span>
          <input
            className="input"
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="AIza…"
            aria-label="Gemini API key"
          />
        </div>
        <details>
          <summary className="muted" style={{ fontSize: 13, cursor: "pointer" }}>Advanced</summary>
          <div className="field" style={{ marginTop: 10 }}>
            <span>MODEL</span>
            <input
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_GEMINI_MODEL}
              spellCheck={false}
              autoCapitalize="off"
            />
          </div>
        </details>
        <button type="button" className="btn" disabled={!keyInput.trim() || testing} onClick={saveKey}>
          {testing ? "Checking key…" : "Save & test key"}
        </button>
        {keyMsg && (
          <div role="status" style={{ fontSize: 13, lineHeight: 1.5, color: keyMsg.ok ? "var(--ink-2)" : "var(--danger)" }}>
            {keyMsg.text}
          </div>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
          Get a free key at{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            aistudio.google.com/apikey
          </a>
          . It&apos;s stored only in this browser — never on a server, never synced — so on a new device you paste it again.
          Anyone using this browser profile could see it, so use a key you can revoke.
        </p>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="label">On-device model</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{ON_DEVICE_LABEL}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>{ON_DEVICE_SIZE_NOTE}.</div>
        </div>

        {gpu === false && (
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            This browser doesn&apos;t support WebGPU, so the on-device model can&apos;t run here. It works in recent desktop Chrome/Edge,
            Android Chrome, and Safari 26 or newer — cloud parsing works everywhere.
          </div>
        )}

        {progress !== null && (
          <div>
            <div className="bar" style={{ height: 10 }}>
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
              {Math.round(progress * 100)}% · {status}
            </div>
          </div>
        )}

        {downloaded ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink-2)" }}>
              <Icon name="check" size={18} /> Downloaded
            </span>
            <button type="button" className="chip" onClick={remove}>
              Delete download
            </button>
          </div>
        ) : (
          <button type="button" className="btn" disabled={gpu === false || progress !== null} onClick={download}>
            <Icon name="download" size={18} />
            {progress !== null ? "Downloading…" : "Download model"}
          </button>
        )}
        {error && (
          <div role="alert" style={{ fontSize: 13, color: "var(--danger)", lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
          Use Wi-Fi — the file is large. On iPhone, a model this size may not fit in browser memory; if it fails, stay on Gemini.
        </p>
      </section>
    </Shell>
  );
}
