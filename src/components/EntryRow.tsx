import Link from "next/link";
import Icon, { MEAL_ICON } from "./Icon";
import { kcal } from "@/lib/nutrition";
import type { Entry } from "@/lib/types";

export default function EntryRow({ entry, sub }: { entry: Entry; sub: string }) {
  return (
    <Link href={`/edit/${entry.id}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 17,
          background: "var(--fill-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-2)",
        }}
      >
        <Icon name={MEAL_ICON[entry.meal]} size={17} />
      </span>
      <span style={{ flexGrow: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entry.name}
        </span>
        <span
          className="muted"
          style={{
            display: "block",
            fontSize: 11.5,
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sub}
        </span>
      </span>
      <span style={{ flexShrink: 0, fontSize: 13, color: "var(--ink-2)" }}>{kcal(entry.calories)} kcal</span>
      <Icon name="chevR" size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
    </Link>
  );
}
