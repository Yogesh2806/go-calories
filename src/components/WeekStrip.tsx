"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { addDays, fromKey, toKey } from "@/lib/nutrition";

/** A scrolling strip of days. Each day is a ring showing how close that day got to the calorie goal. */
export default function WeekStrip({
  selected,
  today,
  kcalByDay,
  goal,
}: {
  selected: string;
  today: string;
  kcalByDay: Map<string, number>;
  goal: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const end = addDays(fromKey(today), 1);
  const days = Array.from({ length: 35 }, (_, i) => addDays(end, i - 34));

  // Start scrolled so the selected day sits near the right edge (today is the usual one).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sel = el.querySelector<HTMLElement>('[aria-current="date"]');
    if (sel) el.scrollLeft = Math.max(0, sel.offsetLeft - el.clientWidth + sel.clientWidth * 2.4);
    else el.scrollLeft = el.scrollWidth;
  }, [selected]);

  return (
    <div ref={ref} className="strip" role="list" aria-label="Days">
      {days.map((d) => {
        const key = toKey(d);
        const future = key > today;
        const cals = kcalByDay.get(key) ?? 0;
        const frac = future ? 0 : Math.min(1, cals / Math.max(1, goal));
        const sel = key === selected;
        const isToday = key === today;
        const C = 2 * Math.PI * 16;
        return (
          <Link
            key={key}
            href={isToday ? "/" : `/day/${key}`}
            role="listitem"
            className="sd"
            aria-current={sel ? "date" : undefined}
            aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          >
            <span className="sd-l" style={{ color: isToday ? "var(--ink)" : undefined }}>
              {d.toLocaleDateString("en-US", { weekday: "narrow" })}
            </span>
            <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
              {future ? (
                <circle cx="21" cy="21" r="16" fill="none" stroke="var(--ink-3)" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="2.5 3.5" />
              ) : (
                <>
                  <circle cx="21" cy="21" r="16" fill="none" stroke="var(--track)" strokeWidth="2.6" />
                  {frac > 0 && (
                    <circle
                      cx="21"
                      cy="21"
                      r="16"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeDasharray={`${C * frac} ${C}`}
                      transform="rotate(-90 21 21)"
                    />
                  )}
                </>
              )}
              {sel && <circle cx="21" cy="21" r="12.2" fill="var(--ink)" />}
              <text
                x="21"
                y="25.6"
                textAnchor="middle"
                fontSize="13"
                fontWeight={sel || isToday ? 700 : 500}
                fill={sel ? "var(--ink-contrast)" : future ? "var(--ink-3)" : "var(--ink)"}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {d.getDate()}
              </text>
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
