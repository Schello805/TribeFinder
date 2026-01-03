"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type FeedbackRow = {
  id: string;
  message: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  createdAt: string;
  archivedAt?: string | null;
  user?: { id: string; email: string; name?: string | null } | null;
};

export default function AdminFeedbackList({ initialItems }: { initialItems: FeedbackRow[] }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<FeedbackRow[]>(initialItems);
  const [mode, setMode] = useState<"active" | "archived">("active");
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => (mode === "archived" ? "?archived=1" : ""), [mode]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback${query}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Laden", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const setArchived = async (id: string, archived: boolean) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      await load();
      showToast(archived ? "Als erledigt markiert" : "Wiederhergestellt", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Speichern", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("active")}
            className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
              mode === "active"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            Aktiv
          </button>
          <button
            type="button"
            onClick={() => setMode("archived")}
            className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
              mode === "archived"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            Archiv
          </button>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {isLoading ? "Lade…" : "Aktualisieren"}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((f) => (
            <li key={f.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{f.createdAt}</span>
                    {(f.reporterName || f.reporterEmail) && (
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {f.reporterName ? f.reporterName : ""}
                        {f.reporterName && f.reporterEmail ? " · " : ""}
                        {f.reporterEmail ? f.reporterEmail : ""}
                      </span>
                    )}
                    {!f.reporterEmail && !f.reporterName && f.user?.email && (
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {f.user.name ? `${f.user.name} (${f.user.email})` : f.user.email}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {f.message}
                  </div>

                  {(f.pageUrl || f.userAgent || f.browser || f.os) && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      {f.pageUrl && (
                        <div className="break-all">
                          <span className="font-medium">URL:</span> {f.pageUrl}
                        </div>
                      )}
                      {(f.browser || f.os) && (
                        <div>
                          <span className="font-medium">Browser/OS:</span> {f.browser || "?"} / {f.os || "?"}
                        </div>
                      )}
                      {f.userAgent && (
                        <div className="break-all">
                          <span className="font-medium">UA:</span> {f.userAgent}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col gap-2">
                  {mode === "active" ? (
                    <button
                      type="button"
                      onClick={() => setArchived(f.id, true)}
                      className="px-3 py-2 rounded-md text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
                    >
                      Erledigt
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setArchived(f.id, false)}
                      className="px-3 py-2 rounded-md text-sm font-semibold border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Zurückholen
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}

          {items.length === 0 && (
            <li className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
              {mode === "active" ? "Noch kein Feedback vorhanden." : "Archiv ist leer."}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
