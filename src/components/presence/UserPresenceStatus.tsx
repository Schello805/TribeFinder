"use client";

import { useEffect, useMemo, useState } from "react";

type PresenceStatus = {
  online: boolean;
  lastSeen: number | null;
  windowMinutes: number;
};

function formatLastSeen(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export default function UserPresenceStatus({ userId }: { userId: string }) {
  const [data, setData] = useState<PresenceStatus | null>(null);

  const url = useMemo(() => `/api/presence/status?userId=${encodeURIComponent(userId)}`,[userId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as PresenceStatus | { message?: string } | null;
        if (!res.ok) return;
        if (!json || typeof json !== "object") return;
        if (cancelled) return;
        if ("online" in json) setData(json as PresenceStatus);
      } catch {
        // ignore
      }
    };

    void load();
    const t = window.setInterval(load, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [url]);

  if (!data) {
    return <div className="mt-2 text-xs text-[var(--muted)]">Status wird geladen…</div>;
  }

  if (data.online) {
    return (
      <div className="mt-2 text-xs">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">Online</span>
        <span className="ml-2 text-[var(--muted)]">(letzte {data.windowMinutes} Minuten)</span>
      </div>
    );
  }

  return (
    <div className="mt-2 text-xs text-[var(--muted)]">
      Zuletzt online: {data.lastSeen ? formatLastSeen(data.lastSeen) : "unbekannt"}
    </div>
  );
}
