"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { useToast } from "@/components/ui/Toast";

type SystemInfo = {
  time: string;
  app: {
    nodeEnv: string | null;
    nextauthUrl: string | null;
    cwd: string;
  };
  runtime: {
    node: string;
    platform: string;
    arch: string;
    pid: number;
    uptimeSec: number;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    os: {
      hostname: string;
      type: string;
      release: string;
      loadavg: number[];
      totalmem: number;
      freemem: number;
    };
    npmUserAgent: string | null;
  };
  packages: {
    next: string | null;
    react: string | null;
    prisma: string | null;
    prismaClient: string | null;
    nextAuth: string | null;
    tailwindcss: string | null;
  };
  database: {
    url:
      | null
      | {
          provider: string;
          maskedUrl: string;
          filePath?: string;
          host?: string;
          database?: string;
          schema?: string | null;
        };
    checks: {
      dbPingOk: boolean;
      dbPingError?: string;
    };
  };
  uploads: {
    path: string;
    exists: boolean;
  };
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export default function AdminSystemPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [info, setInfo] = useState<SystemInfo | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/system");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "System-Infos konnten nicht geladen werden");
      setInfo(data as SystemInfo);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "System-Infos konnten nicht geladen werden", "error");
      setInfo(null);
    } finally {
      setIsLoading(false);
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
      load();
    }
  }, [status, session, router]);

  async function refresh() {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center">Laden...</div>;
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System</h1>
      <AdminNav />

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">System-Informationen</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Zuletzt geladen: {info?.time ? new Date(info.time).toLocaleString() : "-"}</p>
          </div>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          >
            {isRefreshing ? "Aktualisiere..." : "Aktualisieren"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Datenbank</h2>
        </div>
        <div className="px-4 pb-5 sm:px-6 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <div>
            <span className="font-semibold">Provider:</span> {info?.database?.url?.provider ?? "-"}
          </div>
          <div>
            <span className="font-semibold">DATABASE_URL (maskiert):</span>{" "}
            <span className="font-mono text-xs break-all">{info?.database?.url?.maskedUrl ?? "-"}</span>
          </div>
          {info?.database?.url?.filePath ? (
            <div>
              <span className="font-semibold">SQLite Datei:</span> <span className="font-mono text-xs break-all">{info.database.url.filePath}</span>
            </div>
          ) : null}
          <div>
            <span className="font-semibold">DB Ping:</span>{" "}
            {info?.database?.checks?.dbPingOk ? (
              <span className="text-green-700">OK</span>
            ) : (
              <span className="text-red-700">FEHLER</span>
            )}
          </div>
          {info?.database?.checks?.dbPingError ? (
            <pre className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{info.database.checks.dbPingError}</pre>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Runtime</h2>
        </div>
        <div className="px-4 pb-5 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-200">
          <div><span className="font-semibold">Node:</span> {info?.runtime?.node ?? "-"}</div>
          <div><span className="font-semibold">NODE_ENV:</span> {info?.app?.nodeEnv ?? "-"}</div>
          <div><span className="font-semibold">Platform:</span> {info?.runtime?.platform ?? "-"}</div>
          <div><span className="font-semibold">Arch:</span> {info?.runtime?.arch ?? "-"}</div>
          <div><span className="font-semibold">PID:</span> {info?.runtime?.pid ?? "-"}</div>
          <div><span className="font-semibold">Uptime:</span> {info?.runtime?.uptimeSec ?? 0}s</div>
          <div><span className="font-semibold">Memory RSS:</span> {info?.runtime?.memory ? formatBytes(info.runtime.memory.rss) : "-"}</div>
          <div><span className="font-semibold">Heap:</span> {info?.runtime?.memory ? `${formatBytes(info.runtime.memory.heapUsed)} / ${formatBytes(info.runtime.memory.heapTotal)}` : "-"}</div>
          <div className="sm:col-span-2"><span className="font-semibold">npm user agent:</span> <span className="font-mono text-xs break-all">{info?.runtime?.npmUserAgent ?? "-"}</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Pakete</h2>
        </div>
        <div className="px-4 pb-5 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-200">
          <div><span className="font-semibold">next:</span> <span className="font-mono text-xs">{info?.packages?.next ?? "-"}</span></div>
          <div><span className="font-semibold">react:</span> <span className="font-mono text-xs">{info?.packages?.react ?? "-"}</span></div>
          <div><span className="font-semibold">next-auth:</span> <span className="font-mono text-xs">{info?.packages?.nextAuth ?? "-"}</span></div>
          <div><span className="font-semibold">prisma:</span> <span className="font-mono text-xs">{info?.packages?.prisma ?? "-"}</span></div>
          <div><span className="font-semibold">@prisma/client:</span> <span className="font-mono text-xs">{info?.packages?.prismaClient ?? "-"}</span></div>
          <div><span className="font-semibold">tailwindcss:</span> <span className="font-mono text-xs">{info?.packages?.tailwindcss ?? "-"}</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Uploads</h2>
        </div>
        <div className="px-4 pb-5 sm:px-6 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <div>
            <span className="font-semibold">Pfad:</span> <span className="font-mono text-xs break-all">{info?.uploads?.path ?? "-"}</span>
          </div>
          <div>
            <span className="font-semibold">Existiert:</span> {info?.uploads?.exists ? "ja" : "nein"}
          </div>
        </div>
      </div>
    </div>
  );
}
