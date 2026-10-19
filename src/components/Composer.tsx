"use client";

import Link from "next/link";
import Icon from "./Icon";

/** The note-style "what did you eat?" bar pinned above the nav on Today. Tapping it opens the Write screen. */
export default function Composer() {
  return (
    <div className="composer">
      <Link href="/saved" className="iconbtn" aria-label="Saved meals" style={{ background: "transparent", border: 0, width: 44, height: 44 }}>
        <Icon name="bookmark" size={21} />
      </Link>
      <Link href="/write" className="ph" aria-label="Write what you ate">
        What did you eat?
      </Link>
      <Link href="/add?view=barcode" className="iconbtn" aria-label="Scan a barcode" style={{ background: "transparent", border: 0, width: 44, height: 44 }}>
        <Icon name="barcode" size={21} />
      </Link>
      <Link href="/write" className="sendbtn" aria-label="Start writing">
        <Icon name="arrowUp" size={21} stroke={2.2} />
      </Link>
    </div>
  );
}
