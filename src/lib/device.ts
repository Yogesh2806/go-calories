/* What kind of device this is. Phones and tablets have little memory per browser tab, so they only use
 * Gemini (called over the network) and never Chrome's built-in model or the on-device model. */

/** iPhone, iPad or Android, whether the app is installed to the home screen or open in a browser tab. */
export function isPhoneOrTablet(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  // iPadOS pretends to be a Mac; it is the one with a touch screen.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Opened from the home-screen icon rather than a browser tab. */
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}
