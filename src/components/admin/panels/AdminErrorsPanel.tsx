"use client";

import { useCallback, useEffect, useState } from "react";
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

function isErrorLogRow(v: unknown): v is ErrorLogRow {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.fingerprint === "string" &&
    (o.route === null || typeof o.route === "string") &&
    (o.status === null || typeof o.status === "number") &&
    typeof o.message === "string" &&
    (o.details === null || typeof o.details === "string") &&
    (o.stack === null || typeof o.stack === "string") &&
    typeof o.count === "number" &&
    typeof o.firstSeenAt === "string" &&
    typeof o.lastSeenAt === "string" &&
    (o.lastEmailSentAt === null || typeof o.lastEmailSentAt === "string")
  );
}

function getStringProp(obj: unknown, key: string): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function getNumberProp(obj: unknown, key: string): number | null {
  if (typeof obj !== "object" || obj === null) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "number" ? v : null;
}

function getArrayProp(obj: unknown, key: string): unknown[] | null {
  if (typeof obj !== "object" || obj === null) return null;
  const v = (obj as Record<string, unknown>)[key];
  return Array.isArray(v) ? v : null;
}

export default function AdminErrorsPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [errors, setErrors] = useState<ErrorLogRow[]>([]);
  const [infoMessage, setInfoMessage] = useState<string>("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/errors");
      const data = await res.json().catch(() => null);
      const msg = getStringProp(data, "message") ?? "Fehler konnten nicht geladen werden";
      const details = getStringProp(data, "details");

      if (!res.ok) {
        console.error("/api/admin/errors GET failed", { status: res.status, data });
        throw new Error(details ? `${msg}: ${details}` : msg);
      }

      const list =
        getArrayProp(data, "errors") ?? [];

      setErrors((list as unknown[]).filter(isErrorLogRow));
      setInfoMessage(getStringProp(data, "message") ?? "");
    } catch (e) {
      console.error("AdminErrorsPanel load failed", e);
      showToast(e instanceof Error ? e.message : "Fehler konnten nicht geladen werden", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  async function clearAll() {
    if (!confirm("Wirklich alle Fehler löschen?")) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/admin/errors", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      const msg =
        getStringProp(data, "message") ?? "Löschen fehlgeschlagen";

      if (!res.ok) throw new Error(msg);

      const deleted =
        getNumberProp(data, "deleted") ?? 0;
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
  }, [status, session, router, load]);

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Letzte Fehler</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Zeigt die letzten 100 Serverfehler (dedupliziert).</p>
            {infoMessage ? <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">{infoMessage}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 min-h-11"
            >
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={() => void clearAll()}
              disabled={isClearing}
              className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 min-h-11"
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
