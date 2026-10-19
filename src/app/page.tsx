"use client";

import { useGuard, useApp } from "@/lib/app";
import { Splash } from "@/components/Shell";
import Journal from "@/components/Journal";
import SexPrompt from "@/components/SexPrompt";
import { todayKey } from "@/lib/nutrition";

export default function Home() {
  const ok = useGuard();
  const app = useApp();
  if (!ok || !app.profile) return <Splash />;
  return <Journal date={todayKey()} profile={app.profile} banner={<SexPrompt />} />;
}
