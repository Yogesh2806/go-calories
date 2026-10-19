/* Turns a plain-English note into food items with whichever AI engine the person picked in Settings.
 *
 * Default is Chrome's built-in AI. If the chosen engine can't run here (a phone, a model not downloaded,
 * no key) and "try the next one" is on, we fall back Chrome → on-device → Gemini, using only engines that
 * are actually set up on this device. */
import type { AiMode } from "./types";
import type { ParsedItem } from "./describe";
import { chromeAvailability, parseWithChrome } from "./chromeai";
import { isModelDownloaded, parseOnDevice, webgpuAvailable } from "./ondevice";
import { getGeminiKey, parseWithGemini } from "./gemini";

const FALLBACK_KEY = "gc:ai-fallback";
const LAST_KEY = "gc:ai-last";

export function getFallback(): boolean {
  try {
    return localStorage.getItem(FALLBACK_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setFallback(on: boolean): void {
  try {
    localStorage.setItem(FALLBACK_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export interface LastCheck {
  engine: AiMode;
  text: string;
  kcal: number;
  ms: number;
  at: number;
}
export function getLastCheck(): LastCheck | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as LastCheck) : null;
  } catch {
    return null;
  }
}
function saveLast(l: LastCheck) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
}

/** Can this engine run right now, on this device? */
export async function engineReady(m: AiMode): Promise<boolean> {
  if (m === "chrome") return (await chromeAvailability()) === "available";
  if (m === "device") return webgpuAvailable() && (await isModelDownloaded());
  return !!getGeminiKey();
}

async function run(m: AiMode, t: string): Promise<ParsedItem[]> {
  if (m === "chrome") return parseWithChrome(t);
  if (m === "device") return parseOnDevice(t);
  return parseWithGemini(t);
}

/** The error to show when the chosen engine itself isn't usable (and nothing else could take over). */
async function notReadyMessage(m: AiMode): Promise<string> {
  if (m === "chrome") {
    const a = await chromeAvailability();
    if (a === "downloadable") return "Chrome's AI model isn't downloaded yet. Turn it on in AI food parsing settings.";
    if (a === "downloading") return "Chrome is still downloading its AI model. Give it a few minutes, then try again.";
    return "Chrome's built-in AI isn't available in this browser. Pick another engine in AI food parsing settings.";
  }
  if (m === "device") {
    if (!webgpuAvailable()) return "This browser doesn't support WebGPU. Switch to Gemini in AI food parsing settings.";
    return "The on-device model isn't downloaded yet. Download it in AI food parsing settings.";
  }
  return "Add your own Gemini API key first. It's free from Google AI Studio.";
}

const ORDER: AiMode[] = ["chrome", "device", "cloud"];

export async function parseText(mode: AiMode, text: string): Promise<ParsedItem[]> {
  const t = text.trim();
  const started = Date.now();
  const candidates = getFallback() ? [mode, ...ORDER.filter((m) => m !== mode)] : [mode];
  let firstError: Error | null = null;
  for (const m of candidates) {
    if (!(await engineReady(m))) continue;
    try {
      const items = await run(m, t);
      saveLast({
        engine: m,
        text: t.slice(0, 80),
        kcal: Math.round(items.reduce((s, i) => s + i.calories, 0)),
        ms: Date.now() - started,
        at: Date.now(),
      });
      return items;
    } catch (e) {
      firstError ??= e instanceof Error ? e : new Error("Couldn't read that.");
    }
  }
  throw firstError ?? new Error(await notReadyMessage(mode));
}

export function aiLabel(mode: AiMode): string {
  return mode === "chrome" ? "Chrome built-in AI" : mode === "device" ? "On-device model" : "Gemini";
}
