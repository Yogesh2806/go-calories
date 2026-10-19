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
  deviceCrashed,
  isIOS,
  resetDeviceGuard,
  isModelDownloaded,
  loadModel,
  webgpuAvailable,
} from "@/lib/ondevice";
import {
  DEFAULT_GEMINI_MODEL,
  checkGeminiKey,
  clearGeminiKey,
  getGeminiKey,
  getGeminiModel,
  maskKey,
  parseWithGemini,
  pickGeminiModel,
  setGeminiKey,
  setGeminiModel,
} from "@/lib/gemini";
import {
  CHROME_AI_REQUIREMENTS,
  chromeAvailability,
  chromePrepare,
  type ChromeAvailability,
} from "@/lib/chromeai";
import { getFallback, getLastCheck, setFallback, aiLabel, type LastCheck } from "@/lib/parse";
import { Toggle } from "@/components/ui";
import { isPhoneOrTablet } from "@/lib/device";
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

  // Chrome built-in AI
  const [chromeAvail, setChromeAvail] = useState<ChromeAvailability | null>(null);
  const [chromeProgress, setChromeProgress] = useState<number | null>(null);
  const [chromeMsg, setChromeMsg] = useState<string | null>(null);

  // Gemini key (stored in this browser only)
  const [savedKey, setSavedKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [testing, setTesting] = useState(false);
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Fall back to the next engine when the chosen one can't run
  const [crashed, setCrashed] = useState(false);
  const [ios, setIos] = useState(false);
  const [phone, setPhone] = useState(false);
  const [fallback, setFallbackState] = useState(true);
  const [last, setLast] = useState<LastCheck | null>(null);

  useEffect(() => {
    setCrashed(deviceCrashed());
    setIos(isIOS());
    setPhone(isPhoneOrTablet());
    setFallbackState(getFallback());
    setLast(getLastCheck());
    setSavedKey(getGeminiKey());
    setModel(getGeminiModel());
    setGpu(webgpuAvailable());
    isModelDownloaded().then(setDownloaded);
    chromeAvailability().then(setChromeAvail);
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

  async function enableChrome() {
    setChromeMsg(null);
    setChromeProgress(0);
    try {
      await chromePrepare((f) => setChromeProgress(f));
      setChromeAvail(await chromeAvailability());
      await pick("chrome");
    } catch (e) {
      setChromeMsg(e instanceof Error ? e.message : "Couldn't turn on Chrome's built-in AI.");
      setChromeAvail(await chromeAvailability());
    } finally {
      setChromeProgress(null);
    }
  }

  function pickChrome() {
    if (chromeAvail === "available") {
      setChromeMsg(null);
      pick("chrome");
    } else {
      setChromeMsg(
        chromeAvail === "downloadable"
          ? "Download the model below first, then it switches on."
          : chromeAvail === "downloading"
            ? "Chrome is still downloading the model — check back in a few minutes."
            : "Chrome's built-in AI isn't available in this browser.",
      );
    }
  }

  async function saveKey() {
    const k = keyInput.trim();
    if (!k) return;
    setTesting(true);
    setKeyMsg(null);
    try {
      // 1) Is the key valid, and which models can it use? (No answer is requested, so a busy model can't fail this.)
      const available = await checkGeminiKey(k);
      const typed = model.trim();
      const chosen = typed && typed !== DEFAULT_GEMINI_MODEL ? typed : (pickGeminiModel(available) ?? DEFAULT_GEMINI_MODEL);
      setGeminiKey(k);
      setGeminiModel(chosen);
      setModel(chosen);
      setSavedKey(k);
      setKeyInput("");
      await pick("cloud");
      // 2) A real try, only to tell you how it is going. The key is already saved either way.
      try {
        await parseWithGemini("one banana", k, chosen);
        setKeyMsg({ ok: true, text: `Key works and is saved on this device. Using ${chosen}.` });
      } catch (e) {
        const why = e instanceof Error ? e.message : "";
        setKeyMsg({
          ok: true,
          text: `Key is valid and saved on this device (${chosen}). The test answer didn't come back: ${why} Logging will retry and switch models by itself.`,
        });
      }
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
      if (mode === "device") await pick("chrome");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the model.");
    }
  }

  const option = (m: AiMode, icon: "cloud" | "cpu" | "sparkles", title: string, desc: string, onPick: () => void = () => pick(m)) => {
    const on = mode === m;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={onPick}
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
      {phone && (
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          On phones and tablets the app uses Gemini with your own key. Chrome&apos;s built-in AI and the on-device model need a lot of memory,
          so they are only offered on a computer.
        </p>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        When you write &ldquo;2 rotis and a bowl of dal&rdquo; in your note, an AI turns it into calories and macros. Choose where that
        thinking happens.
      </p>

      {!phone && (
      <>
      <div role="radiogroup" aria-label="AI mode" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {option("chrome", "sparkles", "Chrome built-in AI", "The default. Free, private and works offline. Gemini Nano runs inside desktop Chrome, no key needed.", pickChrome)}
        {option("device", "cpu", "On-device model", "Private and works offline after a one-time download. Slower and less accurate.")}
        {option("cloud", "cloud", "Gemini (your own key)", "Fast and accurate. Your descriptions go from this device straight to Google. Works on phones.")}
      </div>

      <section className="card sm" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Try the next one if this can&apos;t run</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>
              Order: Chrome AI, then on-device, then Gemini. Only engines that are set up on this device are used.
            </div>
          </div>
          <Toggle
            label="Fall back to the next engine"
            on={fallback}
            onChange={(v) => {
              setFallback(v);
              setFallbackState(v);
            }}
          />
        </div>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
          {last
            ? `Last check: “${last.text.length > 40 ? last.text.slice(0, 40) + "…" : last.text}” → ${Math.round(last.kcal)} kcal with ${aiLabel(last.engine)} in ${(last.ms / 1000).toFixed(1)} s.`
            : "No check yet. Write something in your note and it shows up here."}
        </div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="label">Chrome built-in AI</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Gemini Nano · free · on this device</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>
            {chromeAvail === null && "Checking this browser…"}
            {chromeAvail === "unavailable" && "Not available in this browser."}
            {chromeAvail === "downloadable" && "Supported here. Chrome downloads the model once (a few GB) and shares it with other sites."}
            {chromeAvail === "downloading" && "Chrome is downloading the model in the background."}
            {chromeAvail === "available" && "Ready on this device."}
          </div>
        </div>

        {chromeProgress !== null && (
          <div>
            <div className="bar" style={{ height: 10 }}>
              <i style={{ width: `${Math.round(chromeProgress * 100)}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{Math.round(chromeProgress * 100)}% downloaded</div>
          </div>
        )}

        {chromeAvail === "downloadable" && (
          <button type="button" className="btn" disabled={chromeProgress !== null} onClick={enableChrome}>
            <Icon name="download" size={18} />
            {chromeProgress !== null ? "Downloading…" : "Download & turn on"}
          </button>
        )}
        {chromeAvail === "downloading" && chromeProgress === null && (
          <button type="button" className="chip" onClick={() => chromeAvailability().then(setChromeAvail)}>
            Check again
          </button>
        )}
        {chromeAvail === "available" && mode !== "chrome" && (
          <button type="button" className="btn" onClick={() => pick("chrome")}>
            Use Chrome built-in AI
          </button>
        )}
        {chromeAvail === "available" && mode === "chrome" && (
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink-2)" }}>
            <Icon name="check" size={18} /> In use
          </span>
        )}
        {chromeMsg && (
          <div role="status" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--danger)" }}>
            {chromeMsg}
          </div>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
          {CHROME_AI_REQUIREMENTS} It estimates from what the model already knows — it can&apos;t search the web — so
          double-check unusual dishes. On a phone, Chrome&apos;s built-in AI isn&apos;t available, so Gemini or the on-device model is used instead.
        </p>
      </section>
      </>
      )}

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
      {!phone && (
      <>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="label">On-device model</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{ON_DEVICE_LABEL}</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>{ON_DEVICE_SIZE_NOTE}.</div>
        </div>

        {crashed && (
          <div role="alert" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--danger)" }}>
            Last time this model ran, the page reloaded, which usually means the phone ran out of memory. On-device parsing is switched off.
            Gemini works well on phones.
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  resetDeviceGuard();
                  setCrashed(false);
                }}
              >
                Try it again anyway
              </button>
            </div>
          </div>
        )}
        {ios && !crashed && (
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            iPhones and iPads limit how much memory a browser tab can use, and this model often goes over it. If the page reloads while you log food,
            use Gemini instead.
          </div>
        )}
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
      </>
      )}
      {phone && downloaded && (
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="label">Free up space</div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            An on-device AI model ({ON_DEVICE_LABEL}) is still stored in this browser. Phones now use Gemini only, so you can remove it.
          </div>
          <button type="button" className="chip" style={{ alignSelf: "flex-start" }} onClick={remove}>
            Delete download
          </button>
          {error && (
            <div role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}
