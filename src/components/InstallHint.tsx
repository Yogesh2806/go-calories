"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Kind = "none" | "prompt" | "ios";

/** "Install this app" helper. Android/desktop Chrome: real install button.
 *  iPhone/iPad Safari: instructions (iOS has no install prompt API). */
export default function InstallHint({ compact = false }: { compact?: boolean }) {
  const [kind, setKind] = useState<Kind>("none");
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) setKind("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setKind("prompt");
    };
    const onInstalled = () => setKind("none");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (kind === "none") return null;

  if (kind === "prompt" && evt) {
    return (
      <button
        type="button"
        className={compact ? "row" : "btn ghost"}
        onClick={async () => {
          await evt.prompt();
          await evt.userChoice.catch(() => undefined);
          setEvt(null);
          setKind("none");
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="download" size={18} />
          Install the app
        </span>
      </button>
    );
  }

  return (
    <div
      className={compact ? undefined : "card sm"}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 13,
        color: "var(--ink-2)",
        lineHeight: 1.45,
        padding: compact ? "14px 0" : undefined,
      }}
    >
      <Icon name="share" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>
        Install on your iPhone: tap <b>Share</b> in Safari, then <b>Add to Home Screen</b>.
      </span>
    </div>
  );
}
