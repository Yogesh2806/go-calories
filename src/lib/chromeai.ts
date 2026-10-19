/* Chrome's built-in AI (Gemini Nano) through the Prompt API.
 *
 * Free, private and — once Chrome has downloaded the model — offline. Desktop Chrome
 * only for now (the model needs a capable GPU and plenty of free disk), and Nano is
 * smaller than cloud Gemini and can't look anything up online: it estimates from what
 * it already knows. Everything runs on the person's own device, so no key and no server.
 */
import { DESCRIBE_SYSTEM, extractJson, normalizeItems, type ParsedItem } from "./describe";
import { MEALS } from "./types";

export type ChromeAvailability = "unavailable" | "downloadable" | "downloading" | "available";

type Session = {
  prompt(text: string, opts?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  clone(opts?: { signal?: AbortSignal }): Promise<Session>;
  destroy(): void;
};
type Monitor = { addEventListener(type: "downloadprogress", fn: (e: { loaded: number }) => void): void };
type LanguageModelApi = {
  availability(opts?: unknown): Promise<ChromeAvailability>;
  create(opts?: unknown): Promise<Session>;
};

const LANGS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

/** Requirements shown to people whose browser can't run it. */
export const CHROME_AI_REQUIREMENTS =
  "Needs desktop Chrome (version 148 or newer) on Windows, macOS or Linux, about 22 GB of free disk space, a GPU with more than 4 GB of video memory and 16 GB of RAM. It isn't available on phones yet.";

function api(): LanguageModelApi | null {
  return typeof self !== "undefined" && "LanguageModel" in self
    ? (self as unknown as { LanguageModel: LanguageModelApi }).LanguageModel
    : null;
}

export async function chromeAvailability(): Promise<ChromeAvailability> {
  const lm = api();
  if (!lm) return "unavailable";
  try {
    return await lm.availability(LANGS);
  } catch {
    return "unavailable";
  }
}

// One base session holds the instructions; every request runs on a clone of it, so no
// request ever sees another's conversation.
let base: Promise<Session> | null = null;

/**
 * Creates the base session. When the model still has to be downloaded this must be
 * called from a click (Chrome requires a user gesture to start the download).
 */
export function chromePrepare(onProgress?: (fraction: number) => void): Promise<Session> {
  const lm = api();
  if (!lm) return Promise.reject(new Error("This browser doesn't have Chrome's built-in AI."));
  if (base) return base;
  base = lm
    .create({
      ...LANGS,
      initialPrompts: [{ role: "system", content: DESCRIBE_SYSTEM }],
      monitor(m: Monitor) {
        m.addEventListener("downloadprogress", (e) => onProgress?.(e.loaded));
      },
    })
    .catch((e) => {
      base = null;
      throw new Error(`Chrome's built-in AI couldn't start${e instanceof Error && e.message ? `: ${e.message}` : "."}`);
    });
  return base;
}

/** Constrains the model's reply to exactly the shape `normalizeItems` expects. */
const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          serving: { type: "string" },
          meal: { type: "string", enum: [...MEALS] },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          fiber_g: { type: "number" },
          sugar_g: { type: "number" },
          sodium_mg: { type: "number" },
          basis: { type: "string" },
        },
        required: ["name", "serving", "calories", "protein_g", "carbs_g", "fat_g"],
      },
    },
  },
  required: ["items"],
};

// The on-device model works best one request at a time.
let queue: Promise<unknown> = Promise.resolve();

export function parseWithChrome(text: string): Promise<ParsedItem[]> {
  const run = async (): Promise<ParsedItem[]> => {
    const avail = await chromeAvailability();
    if (avail === "unavailable") throw new Error("Chrome's built-in AI isn't available in this browser. Switch to Gemini in AI Food Parsing settings.");
    if (avail === "downloading") throw new Error("Chrome is still downloading its AI model. Give it a few minutes, then try again.");
    if (avail === "downloadable") throw new Error("Chrome's AI model isn't downloaded yet. Turn it on in AI Food Parsing settings.");

    const session = await (await chromePrepare()).clone();
    try {
      const reply = await session.prompt(text, { responseConstraint: SCHEMA, signal: AbortSignal.timeout(60_000) });
      const items = normalizeItems(extractJson(reply));
      if (items.length === 0) throw new Error("Chrome's AI couldn't find any foods in that. Try rephrasing.");
      return items;
    } catch (e) {
      if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new Error("Chrome's built-in AI took too long. Try a shorter description.");
      }
      if (e instanceof DOMException && e.name === "NotSupportedError") {
        throw new Error("Chrome's built-in AI can't handle that request.");
      }
      throw e instanceof Error ? e : new Error("Chrome's built-in AI didn't answer.");
    } finally {
      session.destroy();
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}
