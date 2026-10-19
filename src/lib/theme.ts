import type { AccentKey, UiStyle } from "./types";

export const ACCENT_LABEL: Record<AccentKey, string> = {
  graphite: "Graphite",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  yellow: "Yellow",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
};

/** light / dark swatch for every accent. Graphite is the monochrome default. */
export const ACCENT_COLORS: Record<AccentKey, { l: string; d: string; onL: string; onD: string }> = {
  graphite: { l: "#121212", d: "#F3F1EC", onL: "#FFFFFF", onD: "#18191B" },
  blue: { l: "#007AFF", d: "#0A84FF", onL: "#FFFFFF", onD: "#FFFFFF" },
  teal: { l: "#2C9AAC", d: "#40C8DB", onL: "#FFFFFF", onD: "#FFFFFF" },
  green: { l: "#2FA84F", d: "#30D158", onL: "#FFFFFF", onD: "#FFFFFF" },
  yellow: { l: "#B8860B", d: "#E8C13A", onL: "#FFFFFF", onD: "#FFFFFF" },
  orange: { l: "#DD7A16", d: "#FF9F0A", onL: "#FFFFFF", onD: "#FFFFFF" },
  red: { l: "#E0392E", d: "#FF453A", onL: "#FFFFFF", onD: "#FFFFFF" },
  pink: { l: "#D6316B", d: "#FF5C8A", onL: "#FFFFFF", onD: "#FFFFFF" },
  purple: { l: "#9A4FD1", d: "#BF5AF2", onL: "#FFFFFF", onD: "#FFFFFF" },
};

export function applyAccent(key: AccentKey): void {
  const c = ACCENT_COLORS[key] ?? ACCENT_COLORS.graphite;
  const s = document.documentElement.style;
  s.setProperty("--accent-l", c.l);
  s.setProperty("--accent-d", c.d);
  s.setProperty("--accent-on-l", c.onL);
  s.setProperty("--accent-on-d", c.onD);
}

/** Sets the visual style on <html>; CSS keys all the Paper / Mono Glass tokens off it. */
export function applyStyle(style: UiStyle): void {
  document.documentElement.dataset.style = style;
}

/** Paper is light-only for now, so it never goes dark whatever the theme preference says. */
export function resolveDark(pref: "light" | "dark" | "system", style: UiStyle = "glass"): boolean {
  if (style === "paper") return false;
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Runs before first paint (inlined into <head>) so there is no theme flash. */
export const THEME_BOOT_SCRIPT = `(function(){try{
var st=localStorage.getItem('gc:style')==='paper'?'paper':'glass';
document.documentElement.dataset.style=st;
var t=localStorage.getItem('gc:theme')||'system';
var d=st!=='paper'&&(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches));
if(d)document.documentElement.classList.add('dark');
var a=localStorage.getItem('gc:accent');
if(a){var m=JSON.parse(a);var s=document.documentElement.style;
s.setProperty('--accent-l',m.l);s.setProperty('--accent-d',m.d);s.setProperty('--accent-on-l',m.onL);s.setProperty('--accent-on-d',m.onD);}
}catch(e){}})();`;
