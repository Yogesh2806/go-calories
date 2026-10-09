"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import { localRepo, supabaseRepo, type Repo } from "./repo";
import type { Entry, Preset, Profile } from "./types";
import { DEFAULT_SPLIT, dailyCalorieGoal } from "./nutrition";
import { ACCENT_COLORS, applyAccent, resolveDark } from "./theme";

export interface AppUser {
  id: string;
  name: string;
  email: string;
}

type Status = "loading" | "out" | "in";

interface AppCtx {
  status: Status;
  mode: "supabase" | "local";
  user: AppUser | null;
  /** user is signed in and their data has finished loading */
  ready: boolean;
  profile: Profile | null;
  entries: Entry[];
  presets: Preset[];
  /** the day the Add flow logs into (defaults to today) */
  logDate: string;
  setLogDate: (key: string) => void;
  supabaseConfigured: boolean;
  signInGoogle: () => Promise<void>;
  signInLocal: () => void;
  signOut: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  addEntries: (es: Entry[]) => Promise<void>;
  updateEntry: (e: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addPreset: (p: Preset) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  getToken: () => Promise<string | null>;
  notify: (msg: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

/** Redirects to /login or /onboarding as needed. Returns true when the page may render. */
export function useGuard(requireOnboarded = true): boolean {
  const app = useApp();
  const router = useRouter();
  const needsOnboarding = requireOnboarded && !app.profile?.onboarded;
  useEffect(() => {
    if (app.status === "loading") return;
    if (app.status === "out") {
      router.replace("/login");
      return;
    }
    if (app.ready && needsOnboarding) router.replace("/onboarding");
  }, [app.status, app.ready, needsOnboarding, router]);
  return app.status === "in" && app.ready && !needsOnboarding;
}

function defaultProfile(user: AppUser): Profile {
  const base = { heightCm: 170, weightKg: 70, age: 28, activity: "light" as const, goal: "maintain" as const };
  return {
    name: user.name,
    ...base,
    targetWeightKg: 70,
    calorieGoal: dailyCalorieGoal(base),
    split: DEFAULT_SPLIT,
    units: "metric",
    accent: "graphite",
    theme: "system",
    aiMode: "cloud",
    onboarded: false,
  };
}

function userFromSession(s: Session): AppUser {
  const meta = (s.user.user_metadata ?? {}) as Record<string, unknown>;
  const full = String(meta.full_name ?? meta.name ?? "").trim();
  const email = s.user.email ?? "";
  return {
    id: s.user.id,
    name: full.split(" ")[0] || email.split("@")[0] || "there",
    email,
  };
}

const LOCAL_USER: AppUser = { id: "local", name: "Guest", email: "" };

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [mode, setMode] = useState<"supabase" | "local">("supabase");
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [logDate, setLogDate] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const repoRef = useRef<Repo | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* ----- auth state ----- */
  useEffect(() => {
    let local = false;
    try {
      local = localStorage.getItem("gc:mode") === "local";
    } catch {
      /* ignore */
    }
    if (local) {
      setMode("local");
      setUser(LOCAL_USER);
      setStatus("in");
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setStatus("out");
      return;
    }
    let active = true;
    const apply = (s: Session | null) => {
      if (!active) return;
      if (s) {
        setMode("supabase");
        setUser((prev) => (prev?.id === s.user.id ? prev : userFromSession(s)));
        setStatus("in");
      } else {
        setUser(null);
        setStatus("out");
      }
    };
    sb.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => apply(session));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ----- load data once we know who the user is ----- */
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId || !user) {
      repoRef.current = null;
      setReady(false);
      setProfile(null);
      setEntries([]);
      setPresets([]);
      return;
    }
    let cancelled = false;
    let repo: Repo;
    if (mode === "local") {
      repo = localRepo(userId);
    } else {
      const sb = getSupabase();
      if (!sb) return;
      repo = supabaseRepo(sb, userId);
    }
    repoRef.current = repo;
    setReady(false);
    repo
      .load()
      .then((snap) => {
        if (cancelled) return;
        setProfile(snap.profile ?? defaultProfile(user));
        setEntries(snap.entries);
        setPresets(snap.presets);
        setReady(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        notify(`Couldn't load your data: ${e.message}`);
        setProfile(defaultProfile(user));
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode]);

  /* ----- theme + accent ----- */
  const themePref = profile?.theme ?? null;
  const accent = profile?.accent ?? null;
  useEffect(() => {
    if (!themePref) return;
    try {
      localStorage.setItem("gc:theme", themePref);
    } catch {
      /* ignore */
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = resolveDark(themePref);
      document.documentElement.classList.toggle("dark", dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#18191B" : "#FBFBFA");
    };
    apply();
    if (themePref === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [themePref]);
  useEffect(() => {
    if (!accent) return;
    applyAccent(accent);
    try {
      localStorage.setItem("gc:accent", JSON.stringify(ACCENT_COLORS[accent]));
    } catch {
      /* ignore */
    }
  }, [accent]);

  /* ----- actions ----- */
  const fail = useCallback(
    (what: string) => (e: unknown) => {
      notify(`${what}: ${e instanceof Error ? e.message : "something went wrong"}`);
    },
    [notify],
  );

  const signInGoogle = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase isn't configured yet.");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const signInLocal = useCallback(() => {
    try {
      localStorage.setItem("gc:mode", "local");
    } catch {
      /* ignore */
    }
    setMode("local");
    setUser(LOCAL_USER);
    setStatus("in");
  }, []);

  const signOut = useCallback(async () => {
    if (mode === "local") {
      try {
        localStorage.removeItem("gc:mode");
      } catch {
        /* ignore */
      }
      setUser(null);
      setStatus("out");
      setMode("supabase");
      return;
    }
    const sb = getSupabase();
    await sb?.auth.signOut();
    setUser(null);
    setStatus("out");
  }, [mode]);

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return;
      const next = { ...(profile ?? defaultProfile(user)), ...patch };
      setProfile(next);
      try {
        await repoRef.current?.saveProfile(next);
      } catch (e) {
        fail("Couldn't save your profile")(e);
      }
    },
    [user, profile, fail],
  );

  const addEntries = useCallback(
    async (es: Entry[]) => {
      setEntries((prev) => [...prev, ...es]);
      try {
        await repoRef.current?.addEntries(es);
      } catch (e) {
        setEntries((prev) => prev.filter((x) => !es.some((n) => n.id === x.id)));
        fail("Couldn't save that")(e);
        throw e;
      }
    },
    [fail],
  );

  const updateEntry = useCallback(
    async (e: Entry) => {
      const old = entries.find((x) => x.id === e.id);
      setEntries((prev) => prev.map((x) => (x.id === e.id ? e : x)));
      try {
        await repoRef.current?.updateEntry(e);
      } catch (err) {
        if (old) setEntries((prev) => prev.map((x) => (x.id === e.id ? old : x)));
        fail("Couldn't save that")(err);
        throw err;
      }
    },
    [entries, fail],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const old = entries.find((x) => x.id === id);
      setEntries((prev) => prev.filter((x) => x.id !== id));
      try {
        await repoRef.current?.deleteEntry(id);
      } catch (err) {
        if (old) setEntries((prev) => [...prev, old]);
        fail("Couldn't delete that")(err);
        throw err;
      }
    },
    [entries, fail],
  );

  const addPreset = useCallback(
    async (p: Preset) => {
      setPresets((prev) => [p, ...prev]);
      try {
        await repoRef.current?.addPreset(p);
      } catch (err) {
        setPresets((prev) => prev.filter((x) => x.id !== p.id));
        fail("Couldn't save the preset")(err);
      }
    },
    [fail],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const old = presets.find((x) => x.id === id);
      setPresets((prev) => prev.filter((x) => x.id !== id));
      try {
        await repoRef.current?.deletePreset(id);
      } catch (err) {
        if (old) setPresets((prev) => [old, ...prev]);
        fail("Couldn't delete the preset")(err);
      }
    },
    [presets, fail],
  );

  const getToken = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const value = useMemo<AppCtx>(
    () => ({
      status,
      mode,
      user,
      ready,
      profile,
      entries,
      presets,
      logDate,
      setLogDate,
      supabaseConfigured,
      signInGoogle,
      signInLocal,
      signOut,
      saveProfile,
      addEntries,
      updateEntry,
      deleteEntry,
      addPreset,
      deletePreset,
      getToken,
      notify,
    }),
    [
      status,
      mode,
      user,
      ready,
      profile,
      entries,
      presets,
      logDate,
      signInGoogle,
      signInLocal,
      signOut,
      saveProfile,
      addEntries,
      updateEntry,
      deleteEntry,
      addPreset,
      deletePreset,
      getToken,
      notify,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}
