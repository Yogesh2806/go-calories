"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Icon from "./Icon";
import { useApp } from "@/lib/app";
import Composer from "./Composer";

const NAV = [
  { href: "/", label: "Today", tab: "Today", icon: "home" as const },
  { href: "/calendar", label: "Calendar", tab: "Calendar", icon: "calendar" as const },
  { href: "/profile", label: "Profile", tab: "Profile", icon: "user" as const },
];

export function Splash() {
  return (
    <div className="scr" style={{ display: "grid", placeItems: "center" }}>
      <div className="blob" />
      <div
        className="spin"
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          border: "3px solid var(--fill-2)",
          borderTopColor: "var(--ink)",
        }}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

/** Main app frame: ambient blob, content column, bottom dock (phones) / side rail (desktop). */
export default function Shell({
  children,
  nav = true,
  narrow = false,
  composer = false,
  logDate,
}: {
  children: ReactNode;
  nav?: boolean;
  narrow?: boolean;
  /** Show the saved-meals / barcode pill above the nav (the journal). */
  composer?: boolean;
  /** The day the pill's actions add to (defaults to today). */
  logDate?: string;
}) {
  const path = usePathname() ?? "/";
  const paper = useApp().profile?.style === "paper";
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/day/") : path.startsWith(href));
  return (
    <div className={`scr${nav ? " with-rail" : ""}`}>
      <div className="blob" />
      <main className={`page${nav ? "" : " tight"}${narrow ? " narrow" : ""}${nav && composer ? " has-composer" : ""}`}>{children}</main>
      {nav && composer && <Composer logDate={logDate} />}
      {nav && paper && (
        <nav className="tabbar" aria-label="Primary">
          <div className="tabbar-inner">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-label={n.label} aria-current={isActive(n.href) ? "page" : undefined}>
                <Icon name={n.icon} size={22} stroke={isActive(n.href) ? 1.9 : 1.7} />
                <span>{n.tab}</span>
                <i />
              </Link>
            ))}
          </div>
        </nav>
      )}
      {nav && !paper && (
        <>
          <div className="dock-wrap">
            <div className="dock-inner">
              <nav className="dock" aria-label="Primary">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-label={n.label}
                    aria-current={isActive(n.href) ? "page" : undefined}
                  >
                    <Icon name={n.icon} size={22} />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <nav className="rail" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-label={n.label}
                aria-current={isActive(n.href) ? "page" : undefined}
              >
                <Icon name={n.icon} size={22} />
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

export function BackHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button type="button" className="iconbtn" aria-label="Back" onClick={onBack}>
        <Icon name="chevL" size={20} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="h1" style={{ fontSize: 19 }}>
          {title}
        </h1>
        {subtitle && (
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
