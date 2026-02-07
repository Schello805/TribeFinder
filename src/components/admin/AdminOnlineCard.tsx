"use client";

import { useEffect, useState } from "react";

type OnlineUser = {
  id: string;
  email: string;
  name: string | null;
  dancerName: string | null;
  image: string | null;
};

type OnlineResponse = {
  onlineVisitors: number;
  onlineUsers: OnlineUser[];
  windowMinutes: number;
};

export default function AdminOnlineCard() {
  const [data, setData] = useState<OnlineResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/online", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as OnlineResponse | { message?: string } | null;
        if (!res.ok) return;
        if (!json || typeof json !== "object") return;
        if (cancelled) return;
        if ("onlineVisitors" in json && "onlineUsers" in json) {
          setData(json as OnlineResponse);
        }
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
  }, []);

  const windowMinutes = data?.windowMinutes ?? 5;
  const onlineVisitors = data?.onlineVisitors ?? 0;
  const onlineUsers = data?.onlineUsers?.length ?? 0;

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Online (letzte {windowMinutes} Minuten)</dt>
      <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{onlineVisitors}</dd>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Eingeloggt online: {onlineUsers}</div>
    </div>
  );
}
