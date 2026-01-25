"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type ErrorLogRow = {
  id: string;
  fingerprint: string;
  route: string | null;
  status: number | null;
  message: string;
  details: string | null;
  stack: string | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastEmailSentAt: string | null;
};

export default function AdminErrorsPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [errors, setErrors] = useState<ErrorLogRow[]>([]);
  const [infoMessage, setInfoMessage] = useState<string>("");

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/errors");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.message || "Fehler konnten nicht geladen werden");
      setErrors(Array.isArray((data as any)?.errors) ? (data as any).errors : []);
      setInfoMessage(typeof (data as any)?.message === "string" ? (data as any).message : "");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler konnten nicht geladen werden", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function clearAll() {
    if (!confirm("Wirklich alle Fehler löschen?")) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/admin/errors", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.message || "Löschen fehlgeschlagen");
      const deleted = typeof (data as any)?.deleted === "number" ? (data as any).deleted : 0;
      showToast(`Fehlerliste geleert (${deleted})`, "success");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Löschen fehlgeschlagen", "error");
    } finally {
      setIsClearing(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      void load();
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Letzte Fehler</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Zeigt die letzten 100 Serverfehler (dedupliziert).</p>
            {infoMessage ? <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">{infoMessage}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={() => void clearAll()}
              disabled={isClearing}
              className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isClearing ? "Lösche..." : "Alle löschen"}
            </button>
          </div>
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
          <div className="px-4 py-10 text-center text-gray-600 dark:text-gray-300">Keine Fehler vorhanden.</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {errors.map((e) => (
              <details key={e.id} className="px-4 py-4">
                <summary className="cursor-pointer select-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{e.message}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {e.route ? `Route: ${e.route}` : "Route: (unbekannt)"} · Status: {e.status ?? 500} · Count: {e.count} · Last: {new Date(e.lastSeenAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">Details</div>
                  </div>
                </summary>
                {e.details ? <pre className="mt-3 text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{e.details}</pre> : null}
                {e.stack ? <pre className="mt-3 text-xs text-gray-500 dark:text-gray-300 whitespace-pre-wrap">{e.stack}</pre> : null}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
