"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import { Splash } from "@/components/Shell";
import Journal from "@/components/Journal";
import { isValidKey, todayKey } from "@/lib/nutrition";

/** Any other day's note: the same screen as Today, with a "Jump to today" button. */
export default function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  const ok = useGuard();
  const app = useApp();
  const router = useRouter();
  const valid = isValidKey(date);
  useEffect(() => {
    if (!valid || date === todayKey()) router.replace("/");
  }, [valid, date, router]);
  if (!ok || !app.profile || !valid || date === todayKey()) return <Splash />;
  return <Journal key={date} date={date} profile={app.profile} />;
}
