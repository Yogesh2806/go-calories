"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Icon from "./Icon";

const NAV = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/calendar", label: "Calendar", icon: "calendar" as const },
  { href: "/profile", label: "Profile", icon: "user" as const },
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
}: {
  children: ReactNode;
  nav?: boolean;
  narrow?: boolean;
}) {
  const path = usePathname() ?? "/";
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <div className={`scr${nav ? " with-rail" : ""}`}>
      <div className="blob" />
      <main className={`page${nav ? "" : " tight"}${narrow ? " narrow" : ""}`}>{children}</main>
      {nav && (
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
              <Link href="/add" className="fab" aria-label="Log food">
                <Icon name="plus" size={26} stroke={2.2} />
              </Link>
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
            <Link href="/add" className="fab" aria-label="Log food">
              <Icon name="plus" size={22} stroke={2.2} />
            </Link>
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
