"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app";
import { Splash } from "@/components/Shell";
import InstallHint from "@/components/InstallHint";
import Icon from "@/components/Icon";

const PHRASES = ["Track meals", "Log macros", "Watch micros", "Hit your goals", "Stay consistent"];

export default function LoginPage() {
  const app = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (app.status === "in") router.replace("/");
  }, [app.status, router]);

  if (app.status === "loading" || app.status === "in") return <Splash />;

  async function google() {
    setBusy(true);
    setError(null);
    try {
      await app.signInGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start Google sign-in.");
      setBusy(false);
    }
  }

  return (
    <div className="scr" style={{ display: "flex", flexDirection: "column" }}>
      <div className="blob" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: "max(env(safe-area-inset-top), 28px) 24px calc(28px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-hidden="true">
          {PHRASES.map((p, i) => (
            <span
              key={p}
              className="chip"
              style={{
                background: "var(--card-fill)",
                border: "1px solid var(--card-border)",
                transform: `rotate(${[-3, 2, -1, 3, -2][i]}deg)`,
                color: "var(--ink-2)",
              }}
            >
              {p}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "var(--ink)",
              color: "var(--ink-contrast)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="flame" size={32} />
          </div>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>Go Calories</h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.4, color: "var(--ink-2)" }}>
            See exactly what you eat, every single day.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-3)" }}>
            Simple logging. Clear goals. Zero guesswork.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {app.supabaseConfigured && (
            <button type="button" className="btn" onClick={google} disabled={busy}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: "var(--ink-contrast)",
                  color: "var(--ink)",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                G
              </span>
              {busy ? "Opening Google…" : "Sign in with Google"}
            </button>
          )}
          <button
            type="button"
            className={app.supabaseConfigured ? "btn ghost" : "btn"}
            onClick={() => {
              app.signInLocal();
              router.replace("/");
            }}
          >
            {app.supabaseConfigured ? "Continue without an account" : "Get started"}
          </button>
          {error && (
            <div role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
              {error}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-3)", textAlign: "center" }}>
            {app.supabaseConfigured
              ? "Without an account your log stays on this device only."
              : "Your log is stored on this device only. Cloud sync turns on once Supabase is configured."}
          </p>
          <InstallHint />
        </div>
      </div>
    </div>
  );
}
