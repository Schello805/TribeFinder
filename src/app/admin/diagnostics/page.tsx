"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { useToast } from "@/components/ui/Toast";

type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  message: string;
  details?: string;
  durationMs: number;
};

type E2EReport =
  | {
      exists: false;
      message: string;
    }
  | {
      exists: true;
      ok?: boolean;
      message?: string;
      summary?: {
        passed: number;
        failed: number;
        skipped: number;
        flaky: number;
        durationMs: number | null;
      };
    };

export default function AdminDiagnosticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [e2eReport, setE2eReport] = useState<E2EReport | null>(null);

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
      fetch("/api/admin/e2e-report")
        .then((r) => r.json())
        .then((data) => setE2eReport(data))
        .catch(() => setE2eReport(null));
    }
  }, [status, session, router]);

  async function runDiagnostics() {
    setIsRunning(true);
    setResults([]);

    try {
      const res = await fetch("/api/admin/diagnostics");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Diagnose fehlgeschlagen");
      setResults(Array.isArray(data?.checks) ? data.checks : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Diagnose fehlgeschlagen", "error");
    } finally {
      setIsRunning(false);
    }
  }

  function badge(status: CheckResult["status"]) {
    if (status === "ok") return "bg-green-100 text-green-800";
    if (status === "warn") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Diagnose</h1>
      <AdminNav />

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">E2E Smoke-Test (Playwright)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ausführen im Terminal: <span className="font-mono">npm run e2e</span>
          </p>

          {e2eReport ? (
            e2eReport.exists ? (
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                <div>
                  Status: {e2eReport.ok ? "OK" : "FEHLER"}
                </div>
                {e2eReport.summary ? (
                  <div>
                    Passed: {e2eReport.summary.passed} · Failed: {e2eReport.summary.failed} · Skipped: {e2eReport.summary.skipped} · Flaky: {e2eReport.summary.flaky}
                  </div>
                ) : null}
                {e2eReport.message ? <div>{e2eReport.message}</div> : null}
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">{e2eReport.message}</div>
            )
          ) : (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Kein Report geladen.</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Self-Test</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Prüft Datenbank, Uploads, Konfiguration und wichtige Endpunkte.
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          >
            {isRunning ? "Läuft..." : "Diagnose starten"}
          </button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Ergebnisse</h2>
          </div>
          <div className="px-4 pb-5 sm:px-6 space-y-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="rounded border border-gray-200 dark:border-gray-700 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-gray-900 dark:text-white">{r.label}</div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${badge(r.status)}`}>
                    {r.status.toUpperCase()}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{r.message}</div>
                {r.details ? (
                  <pre className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                    {r.details}
                  </pre>
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
