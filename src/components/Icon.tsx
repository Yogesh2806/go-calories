import type { CSSProperties } from "react";

const P: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calendar: "M5 4.5h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2zM8 2.5v4M16 2.5v4M3 10h18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  plus: "M12 5v14M5 12h14",
  chevR: "m9 6 6 6-6 6",
  chevL: "m15 6-6 6 6 6",
  chevD: "m6 9 6 6 6-6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  barcode: "M4 5v14M7 5v14M10.5 5v14M13 5v14M16 5v14M20 5v14",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16v4M17 18h4",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  check: "m5 12.5 4.5 4.5L19 7",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
  ruler: "M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",
  bell: "M6 9a6 6 0 0 1 12 0c0 6 2 7 2 8H4c0-1 2-2 2-8zM10 21h4",
  logout: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9",
  flame: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  x: "M6 6l12 12M18 6 6 18",
  pencil: "M4 20l1-4L16 5l3 3L8 19z",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  scale: "M5 4h14l1 16H4zM9 10a3 3 0 0 1 6 0",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  sunrise: "M12 3v3M4.5 7.5 6.6 9.6M19.5 7.5 17.4 9.6M6 17a6 6 0 0 1 12 0M3 17h18M7 21h10",
  cookie: "M20 12a8 8 0 1 1-8-8c0 2 1.5 3 3 3 0 2 1.5 3 3 3 1 0 2 .5 2 2zM9 10h.01M9 15h.01M14 15h.01",
  cup: "M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  share: "M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  cpu: "M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  arrowUp: "M12 19V6M6.5 11.5 12 6l5.5 5.5",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  minus: "M5 12h14",
  bolt: "M13 3 5 13.5h6L10 21l8-10.5h-6z",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z",
  cloud: "M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1A3.5 3.5 0 0 1 17 18z",
};

export type IconName = keyof typeof P;

export default function Icon({
  name,
  size = 20,
  stroke = 1.9,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      className={className}
    >
      <path d={P[name]} />
    </svg>
  );
}

export const MEAL_ICON: Record<string, IconName> = {
  breakfast: "sunrise",
  lunch: "sun",
  snacks: "cookie",
  drinks: "cup",
  dinner: "moon",
};
