"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app";
import { Splash } from "@/components/Shell";

/** Google → Supabase → here. The Supabase browser client exchanges the `?code=`
 *  for a session on load (PKCE); once the app sees the session we move on. */
export default function AuthCallback() {
  const app = useApp();
  const router = useRouter();

  useEffect(() => {
    if (app.status === "in") router.replace("/");
  }, [app.status, router]);

  useEffect(() => {
    // If sign-in didn't complete (denied, expired link…) go back to /login.
    const t = setTimeout(() => {
      if (app.status !== "in") router.replace("/login");
    }, 12000);
    return () => clearTimeout(t);
  }, [app.status, router]);

  return <Splash />;
}
