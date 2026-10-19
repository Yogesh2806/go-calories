"use client";

import Link from "next/link";
import Icon from "./Icon";
import { useApp } from "@/lib/app";

/** The small pill above the tab bar on Today: saved meals and barcode. Writing happens in the note itself. */
export default function Composer({ logDate }: { logDate?: string }) {
  const app = useApp();
  const point = () => app.setLogDate(logDate ?? "");
  return (
    <div className="composer" role="toolbar" aria-label="Quick add">
      <Link href="/saved" onClick={point} className="tool" aria-label="Saved meals">
        <Icon name="bookmark" size={22} />
      </Link>
      <span className="tool-sep" aria-hidden="true" />
      <Link href="/add?view=barcode" onClick={point} className="tool" aria-label="Scan a barcode">
        <Icon name="barcode" size={22} />
      </Link>
    </div>
  );
}
