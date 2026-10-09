"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds only (in dev it would
 *  cache stale code and make hot reload confusing). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        /* offline support is a bonus — never block the app on it */
      });
  }, []);
  return null;
}
