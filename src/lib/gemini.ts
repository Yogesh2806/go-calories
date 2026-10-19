/* Gemini, called straight from the browser with the user's own API key.
 *
 * The key is pasted into Settings → AI Food Parsing and kept in this browser's
 * localStorage only — it is never sent to this app's server, never put in an
 * environment variable, and never synced to Supabase. Requests go directly from
 * the device to generativelanguage.googleapis.com (which allows browser calls).
 */
import { DESCRIBE_SYSTEM, extractJson, normalizeItems, type ParsedItem } from "./describe";

const KEY_STORE = "gc:geminiKey";
const MODEL_STORE = "gc:geminiModel";
const LIST_STORE = "gc:geminiModels";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

function read(k: string): string {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
}
function write(k: string, v: string) {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
}

/** The models Google says this key can use, remembered from the last key check. */
function cachedModels(): string[] {
  try {
    const v = JSON.parse(read(LIST_STORE) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export const getGeminiKey = () => read(KEY_STORE);
export const setGeminiKey = (k: string) => write(KEY_STORE, k.trim());
export const clearGeminiKey = () => {
  write(KEY_STORE, "");
  write(LIST_STORE, "");
};
export const getGeminiModel = () => read(MODEL_STORE) || DEFAULT_GEMINI_MODEL;
export const setGeminiModel = (m: string) => write(MODEL_STORE, m.trim() === DEFAULT_GEMINI_MODEL ? "" : m.trim());
export const maskKey = (k: string) => (k.length > 8 ? `${k.slice(0, 4)}…${k.slice(-4)}` : "saved");

const SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          serving: { type: "STRING" },
          meal: { type: "STRING", enum: ["breakfast", "lunch", "snacks", "drinks", "dinner"] },
          calories: { type: "NUMBER" },
          protein_g: { type: "NUMBER" },
          carbs_g: { type: "NUMBER" },
          fat_g: { type: "NUMBER" },
          fiber_g: { type: "NUMBER" },
          sugar_g: { type: "NUMBER" },
          sodium_mg: { type: "NUMBER" },
          basis: { type: "STRING" },
        },
        required: ["name", "serving", "calories", "protein_g", "carbs_g", "fat_g"],
      },
    },
  },
  required: ["items"],
};

/** What to send. Newer Gemini models "think" before answering, which is slow and pointless for a food estimate, so we ask for
 *  little thinking first and fall back to plainer requests if a model refuses the setting. */
interface Rung {
  schema: boolean;
  think: boolean;
}
const LADDER: Rung[] = [
  { schema: true, think: true },
  { schema: true, think: false },
  { schema: false, think: false },
];

function request(key: string, model: string, text: string, rung: Rung, timeoutMs: number) {
  const generationConfig: Record<string, unknown> = { temperature: 0.2, responseMimeType: "application/json" };
  if (rung.schema) generationConfig.responseSchema = SCHEMA;
  if (rung.think) generationConfig.thinkingConfig = { thinkingLevel: "low" };
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: DESCRIBE_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
}

async function failure(res: Response, model: string): Promise<Error> {
  let msg = "";
  try {
    msg = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
  } catch {
    /* ignore */
  }
  if (res.status === 400 && /api key/i.test(msg)) return new Error("Google rejected that API key. Check you copied all of it.");
  if (res.status === 401 || res.status === 403) return new Error("This API key isn't allowed to use Gemini. Create a fresh key in Google AI Studio.");
  if (res.status === 404) return new Error(`Model “${model}” wasn't found for your key. Change the model name under Advanced.`);
  if (res.status === 429) return new Error("Gemini's free-tier limit was hit. Wait a minute and try again.");
  if (res.status >= 500) return new Error("Gemini is busy right now. Give it a moment and try again.");
  return new Error(`Gemini error ${res.status}. ${msg}`.trim().slice(0, 240));
}

/** Other Gemini models to try, in order, when the chosen one is busy, slow or missing. */
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
const BUSY = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isTimeout = (e: unknown) => e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");

function readReply(data: {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}): ParsedItem[] {
  const out = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  if (!out) throw new Error("Gemini returned nothing. Try rephrasing.");
  const items = normalizeItems(extractJson(out));
  if (items.length === 0) throw new Error("Couldn't find any foods in that. Try rephrasing.");
  return items;
}

/** Checks a key without asking for an answer (so a busy model can't fail it) and lists the models it can use. */
export async function checkGeminiKey(key: string): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    if (isTimeout(e)) throw new Error("Google took too long to answer. Try again.");
    throw new Error("Couldn't reach Google. Check your connection.");
  }
  if (!res.ok) throw await failure(res, "");
  const data = (await res.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
  const list = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    .filter(Boolean);
  write(LIST_STORE, JSON.stringify(list));
  return list;
}

/** Stable fast models worth trying, best first: the preferred ones, then any other flash model the key has. */
function chainFor(chosen: string, available: string[]): string[] {
  const prefs = [DEFAULT_GEMINI_MODEL, ...FALLBACK_MODELS];
  if (available.length === 0) return [chosen, ...prefs.filter((m) => m !== chosen)].slice(0, 4);
  const flash = available.filter((m) => /flash/.test(m) && !/(preview|exp|image|tts|live|audio|thinking|robotics|computer)/.test(m));
  const ordered = [chosen, ...prefs, ...flash].filter((m) => available.includes(m));
  return [...new Set(ordered)].slice(0, 4);
}

/** The best fast model this key can use, from what Google says is available. */
export function pickGeminiModel(available: string[]): string | null {
  for (const m of [DEFAULT_GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.6-flash"]) if (available.includes(m)) return m;
  const flash = available.filter((m) => /flash/.test(m) && !/(preview|exp|image|tts|live|audio|thinking)/.test(m));
  return flash[0] ?? null;
}

/** Parses a plain-English meal description into food items using the user's own key.
 *  If the chosen model is busy (503), rate limited, slow or missing, it moves on to other Gemini models,
 *  so a spike on one model does not stop you logging. A wrong or blocked key stops straight away. */
export async function parseWithGemini(text: string, key = getGeminiKey(), model = getGeminiModel()): Promise<ParsedItem[]> {
  if (!key) throw new Error("Add your Gemini API key in AI Food Parsing settings first.");
  let available = cachedModels();
  if (available.length === 0) {
    try {
      available = await checkGeminiKey(key); // learn which models this key really has (also catches a bad key early)
    } catch (e) {
      if (e instanceof Error && /API key|isn't allowed/.test(e.message)) throw e;
    }
  }
  const chosen = chainFor(model, available);
  const chain = chosen.length ? chosen : [model];
  const lead = chain[0];
  const tried: string[] = [];
  let firstError: Error | null = null;
  let timedOut = false;
  try {
    for (const m of chain) {
      for (let attempt = 0; attempt < (m === lead ? 2 : 1); attempt++) {
        let res: Response | null = null;
        try {
          for (const rung of LADDER) {
            res = await request(key, m, text, rung, 14_000);
            if (res.status !== 400 && res.status !== 500) break; // 400/500: this model dislikes the request shape, try a plainer one
            let msg = "";
            try {
              msg = ((await res.clone().json()) as { error?: { message?: string } }).error?.message ?? "";
            } catch {
              /* ignore */
            }
            if (/api key/i.test(msg)) throw await failure(res, m); // the key itself is wrong: stop at once
          }
        } catch (e) {
          if (isTimeout(e)) {
            timedOut = true;
            tried.push(`${m}: no answer in 14s`);
            break; // too slow: try the next model
          }
          throw e;
        }
        if (!res) break;
        if (res.ok) return readReply((await res.json()) as Parameters<typeof readReply>[0]);
        const err = await failure(res, m);
        if (res.status === 401 || res.status === 403) throw err; // the key isn't allowed
        firstError ??= err;
        if (attempt === 0 || res.status !== 503) tried.push(`${m}: ${res.status}`);
        if (BUSY.has(res.status) && attempt === 0 && m === lead) {
          await sleep(900); // one quick retry on the chosen model
          continue;
        }
        break; // try the next model
      }
    }
    if (firstError) throw new Error(`${firstError.message} (Tried ${tried.join(", ")}.)`);
    throw new Error(timedOut ? "Gemini took too long. Try again." : "Gemini didn't answer. Try again.");
  } catch (e) {
    if (isTimeout(e)) throw new Error("Gemini took too long. Try again.");
    if (e instanceof TypeError) throw new Error("Couldn't reach Gemini. Check your connection.");
    throw e;
  }
}
