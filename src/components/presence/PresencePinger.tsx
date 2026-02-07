"use client";

import { useEffect, useRef } from "react";

export default function PresencePinger() {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        await fetch("/api/presence/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          keepalive: true,
        });
      } catch {
        // ignore
      }
    };

    const schedule = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (cancelled) return;
        void ping();
      }, 60_000);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void ping();
      }
    };

    void ping();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
