"use client";

import { useEffect, useState } from "react";

type OnlineUser = {
  id: string;
  email: string;
  name: string | null;
  dancerName: string | null;
  image: string | null;
  minutesAgo?: number | null;
};

type OnlineResponse = {
  onlineVisitors: number;
  onlineUsers: OnlineUser[];
  windowMinutes: number;
};

export default function AdminOnlineCard() {
  const [data, setData] = useState<OnlineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const load = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/online", { cache: "no-store", signal });
      const json = (await res.json().catch(() => null)) as OnlineResponse | { message?: string } | null;
      if (!res.ok) {
        const msg = json && typeof json === "object" && "message" in json ? String(json.message || "") : "";
        setError(msg || `Fehler beim Laden (${res.status})`);
        return;
      }
      if (!json || typeof json !== "object") {
        setError("Ungültige Antwort");
        return;
      }
      if ("onlineVisitors" in json && "onlineUsers" in json) {
        setData(json as OnlineResponse);
        setLastUpdatedAt(Date.now());
      }
    } catch (e) {
      const aborted = e && typeof e === "object" && "name" in e && String((e as { name?: unknown }).name) === "AbortError";
      if (!aborted) setError("Fehler beim Laden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadSafe = async () => {
      await load(controller.signal);
    };

    void loadSafe();
    const t = window.setInterval(() => {
      void loadSafe();
    }, 30_000);

    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, []);

  const windowMinutes = data?.windowMinutes ?? 5;
  const onlineVisitors = data?.onlineVisitors ?? 0;
  const onlineUsers = data?.onlineUsers?.length ?? 0;
  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("de-DE") : null;

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Besucher online (letzte {windowMinutes} Minuten)</dt>
      <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{onlineVisitors}</dd>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Eingeloggt online (letzte {windowMinutes} Minuten): {onlineUsers}</div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
        >
          {isLoading ? "Prüfe…" : "Jetzt prüfen"}
        </button>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:underline"
          aria-expanded={showDetails}
        >
          {showDetails ? "Details ausblenden" : "Details anzeigen"}
        </button>

        {updatedLabel ? <div className="text-xs text-gray-400">Stand: {updatedLabel}</div> : null}
      </div>

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}

      {showDetails && data ? (
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div>onlineVisitors: {data.onlineVisitors}</div>
          <div>onlineUsers: {data.onlineUsers.length}</div>
          {data.onlineUsers.length > 0 ? (
            <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
              {data.onlineUsers.slice(0, 10).map((u) => (
                <div key={u.id} className="truncate">
                  {u.email}
                  {typeof u.minutesAgo === "number" ? ` (${u.minutesAgo}m)` : ""}
                </div>
              ))}
              {data.onlineUsers.length > 10 ? <div className="text-gray-400">…</div> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
