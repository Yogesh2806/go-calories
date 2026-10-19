/* Turns a plain-English note into food items with whichever AI engine the person picked in Settings. */
import type { AiMode } from "./types";
import type { ParsedItem } from "./describe";
import { parseWithChrome } from "./chromeai";
import { isModelDownloaded, parseOnDevice, webgpuAvailable } from "./ondevice";
import { getGeminiKey, parseWithGemini } from "./gemini";

export async function parseText(mode: AiMode, text: string): Promise<ParsedItem[]> {
  const t = text.trim();
  if (mode === "chrome") return parseWithChrome(t);
  if (mode === "device") {
    if (!webgpuAvailable()) throw new Error("This browser doesn't support WebGPU. Switch to Gemini in AI Food Parsing settings.");
    if (!(await isModelDownloaded())) throw new Error("The on-device model isn't downloaded yet. Download it in AI Food Parsing settings.");
    return parseOnDevice(t);
  }
  if (!getGeminiKey()) throw new Error("Add your own Gemini API key first — it's free from Google AI Studio.");
  return parseWithGemini(t);
}

export function aiLabel(mode: AiMode): string {
  return mode === "chrome" ? "Chrome built-in AI, on this device" : mode === "device" ? "On-device model" : "Gemini (your key)";
}
