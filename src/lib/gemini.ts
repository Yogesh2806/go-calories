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
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

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

export const getGeminiKey = () => read(KEY_STORE);
export const setGeminiKey = (k: string) => write(KEY_STORE, k.trim());
export const clearGeminiKey = () => write(KEY_STORE, "");
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

function request(key: string, model: string, text: string, withSchema: boolean) {
  const generationConfig: Record<string, unknown> = { temperature: 0.2, responseMimeType: "application/json" };
  if (withSchema) generationConfig.responseSchema = SCHEMA;
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
      signal: AbortSignal.timeout(20_000),
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

/** Other Gemini models to try, in order, when the chosen one is busy or missing. */
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
const BUSY = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** Parses a plain-English meal description into food items using the user's own key.
 *  If the chosen model is busy (503), rate limited or missing, it retries once and then tries other Gemini models,
 *  so a spike on one model does not stop you logging. A wrong or blocked key stops straight away. */
export async function parseWithGemini(text: string, key = getGeminiKey(), model = getGeminiModel()): Promise<ParsedItem[]> {
  if (!key) throw new Error("Add your Gemini API key in AI Food Parsing settings first.");
  const chain = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
  let firstError: Error | null = null;
  try {
    for (const m of chain) {
      for (let attempt = 0; attempt < (m === model ? 2 : 1); attempt++) {
        let res = await request(key, m, text, true);
        if (res.status === 400) {
          const retry = await request(key, m, text, false); // some models reject a response schema
          if (retry.ok) res = retry;
        }
        if (res.ok) return readReply((await res.json()) as Parameters<typeof readReply>[0]);
        const err = await failure(res, m);
        if (res.status === 400 || res.status === 401 || res.status === 403) throw err; // the key or the request itself is wrong
        firstError ??= err;
        if (BUSY.has(res.status) && attempt === 0 && m === model) {
          await sleep(900); // one quick retry on the chosen model
          continue;
        }
        break; // try the next model
      }
    }
    throw firstError ?? new Error("Gemini didn't answer. Try again.");
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError"))
      throw new Error("Gemini took too long. Try again.");
    if (e instanceof TypeError) throw new Error("Couldn't reach Gemini. Check your connection.");
    throw e;
  }
}
