"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches server data when the app returns to the foreground, so each
 * spouse sees the other's latest expenses without WebSockets.
 */
export function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 5_000) {
        last = Date.now();
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  return null;
}
