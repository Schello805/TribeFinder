"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  message: string;
  details?: string;
  durationMs: number;
};

function isCheckResult(v: unknown): v is CheckResult {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    (o.status === "ok" || o.status === "warn" || o.status === "fail") &&
    typeof o.message === "string" &&
    typeof o.durationMs === "number" &&
    (o.details === undefined || typeof o.details === "string")
  );
}

function getStringProp(obj: unknown, key: string): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function getArrayProp(obj: unknown, key: string): unknown[] | null {
  if (typeof obj !== "object" || obj === null) return null;
  const v = (obj as Record<string, unknown>)[key];
  return Array.isArray(v) ? v : null;
}

export default function AdminDiagnosticsPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [status, session, router]);

  async function runDiagnostics() {
    setIsRunning(true);
    setResults([]);

    try {
      const res = await fetch("/api/admin/diagnostics");
      const data = await res.json().catch(() => null);

      const msg =
        getStringProp(data, "message") ?? "Diagnose fehlgeschlagen";

      if (!res.ok) throw new Error(msg);

      const checks =
        getArrayProp(data, "checks") ?? [];

      setResults((checks as unknown[]).filter(isCheckResult));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Diagnose fehlgeschlagen", "error");
    } finally {
      setIsRunning(false);
    }
  }

  function badge(status: CheckResult["status"]) {
    if (status === "ok") return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
    if (status === "warn") return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
    return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Self-Test</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Prüft Datenbank, Uploads, Konfiguration und wichtige Endpunkte.</p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 min-h-11"
          >
            {isRunning ? "Läuft..." : "Diagnose starten"}
          </button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Ergebnisse</h2>
          </div>
          <div className="px-4 pb-5 sm:px-6 space-y-2">
            {results.map((r) => (
              <div key={r.id} className="rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-gray-900 dark:text-white">{r.label}</div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${badge(r.status)}`}>{r.status.toUpperCase()}</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{r.message}</div>
                {r.details ? (
                  <pre className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">{r.details}</pre>
                ) : null}
                <div className="text-xs text-gray-400 mt-1">{r.durationMs}ms</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
