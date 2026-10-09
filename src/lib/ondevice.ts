/* Experimental on-device food parsing.
 *
 * Runs a small open model (Qwen2.5-1.5B, 4-bit) fully in the browser through
 * WebGPU using @mlc-ai/web-llm. The weights (~1 GB) download once, are cached by
 * the browser, and after that parsing works offline. Needs a WebGPU browser
 * (desktop Chrome/Edge, recent Android Chrome, Safari 26+). The library is loaded
 * lazily so it never touches the normal app bundle.
 */
import { DESCRIBE_SYSTEM, extractJson, normalizeItems, type ParsedItem } from "./describe";

export const ON_DEVICE_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
export const ON_DEVICE_LABEL = "Qwen2.5 1.5B (4-bit)";
export const ON_DEVICE_SIZE_NOTE = "about 1 GB download, ~1.6 GB of video memory while running";

type Engine = import("@mlc-ai/web-llm").MLCEngine;
let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;

export function webgpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export async function isModelDownloaded(): Promise<boolean> {
  try {
    const { hasModelInCache } = await import("@mlc-ai/web-llm");
    return await hasModelInCache(ON_DEVICE_MODEL);
  } catch {
    return false;
  }
}

/** Downloads (first time) and warms up the model. `onProgress` gets 0..1. */
export function loadModel(onProgress?: (p: number, text: string) => void): Promise<Engine> {
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  loading = (async () => {
    if (!webgpuAvailable()) throw new Error("This browser doesn't support WebGPU, which on-device AI needs.");
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
    const e = await CreateMLCEngine(ON_DEVICE_MODEL, {
      initProgressCallback: (r) => onProgress?.(r.progress, r.text),
    });
    engine = e;
    return e;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export async function deleteModel(): Promise<void> {
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  try {
    await engine?.unload();
  } catch {
    /* ignore */
  }
  engine = null;
  await deleteModelAllInfoInCache(ON_DEVICE_MODEL);
}

export async function parseOnDevice(text: string): Promise<ParsedItem[]> {
  const e = await loadModel();
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: DESCRIBE_SYSTEM },
      { role: "user", content: text },
    ],
    temperature: 0.2,
    max_tokens: 900,
  });
  const out = reply.choices[0]?.message?.content ?? "";
  const items = normalizeItems(extractJson(out));
  if (items.length === 0) throw new Error("The on-device model couldn't find any foods. Try rephrasing.");
  return items;
}
