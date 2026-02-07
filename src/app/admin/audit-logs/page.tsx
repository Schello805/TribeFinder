"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { useToast } from "@/components/ui/Toast";

type AuditItem = {
  id: string;
  action: string;
  createdAt: string;
  targetBackupFilename: string | null;
  metadata: unknown;
  actorAdmin: { id: string; name: string | null; email: string };
  targetUser: { id: string; name: string | null; email: string } | null;
};

type AuditResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AuditItem[];
};

const AUDIT_ACTION_OPTIONS = [
  "USER_UPDATE",
  "USER_DELETE",
  "USER_PASSWORD_RESET",
  "USER_RESEND_VERIFICATION",
  "BACKUP_CREATE",
  "BACKUP_DELETE",
  "BACKUP_UPLOAD",
  "BACKUP_PURGE",
  "BACKUP_RESTORE",
] as const;

type ActionsOnlyResponse = {
  actions: string[];
};

function safeJsonPreview(value: unknown) {
  try {
    if (value === null || value === undefined) return "";
    const s = JSON.stringify(value);
    if (s.length <= 200) return s;
    return `${s.slice(0, 200)}…`;
  } catch {
    return "";
  }
}

export default function AdminAuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AuditResponse | null>(null);

  const page = Number(searchParams.get("page") || "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") || "50") || 50;
  const action = (searchParams.get("action") || "").trim();
  const actorEmail = (searchParams.get("actorEmail") || "").trim();
  const targetEmail = (searchParams.get("targetEmail") || "").trim();
  const q = (searchParams.get("q") || "").trim();
  const sortField = (searchParams.get("sortField") || "createdAt").trim();
  const sortDir = (searchParams.get("sortDir") || "desc").trim();

  const [actionInput, setActionInput] = useState(action);
  const [actorEmailInput, setActorEmailInput] = useState(actorEmail);
  const [targetEmailInput, setTargetEmailInput] = useState(targetEmail);
  const [qInput, setQInput] = useState(q);

  const [dynamicActions, setDynamicActions] = useState<string[] | null>(null);

  const actionOptions = (dynamicActions && dynamicActions.length > 0 ? dynamicActions : Array.from(AUDIT_ACTION_OPTIONS)) as string[];

  const [actionMode, setActionMode] = useState<"any" | "preset" | "custom">(
    action ? (AUDIT_ACTION_OPTIONS.includes(action as (typeof AUDIT_ACTION_OPTIONS)[number]) ? "preset" : "custom") : "any"
  );

  const [presetAction, setPresetAction] = useState<string>(
    AUDIT_ACTION_OPTIONS.includes(action as (typeof AUDIT_ACTION_OPTIONS)[number]) ? action : ""
  );

  useEffect(() => {
    setActionInput(action);
    setActorEmailInput(actorEmail);
    setTargetEmailInput(targetEmail);
    setQInput(q);

    if (!action) {
      setActionMode("any");
      setPresetAction("");
      return;
    }

    if (AUDIT_ACTION_OPTIONS.includes(action as (typeof AUDIT_ACTION_OPTIONS)[number])) {
      setActionMode("preset");
      setPresetAction(action);
    } else {
      setActionMode("custom");
      setPresetAction("");
    }
  }, [action, actorEmail, targetEmail, q]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role !== "ADMIN") return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/audit-logs?actionsOnly=1");
        const json = (await res.json().catch(() => null)) as ActionsOnlyResponse | { message?: string } | null;
        if (!res.ok) return;
        if (!json || typeof json !== "object" || !("actions" in json)) return;
        const actions = Array.isArray((json as ActionsOnlyResponse).actions) ? (json as ActionsOnlyResponse).actions : [];
        if (!cancelled) setDynamicActions(actions);
      } catch {
        // ignore (fallback to static list)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.role, status]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));
      sp.set("sortField", sortField);
      sp.set("sortDir", sortDir);
      if (action) sp.set("action", action);
      if (actorEmail) sp.set("actorEmail", actorEmail);
      if (targetEmail) sp.set("targetEmail", targetEmail);
      if (q) sp.set("q", q);

      const res = await fetch(`/api/admin/audit-logs?${sp.toString()}`);
      const json = (await res.json().catch(() => null)) as AuditResponse | { message?: string } | null;
      if (!res.ok) throw new Error((json as { message?: string } | null)?.message || "Laden fehlgeschlagen");
      setData(json as AuditResponse);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Audit-Logs konnten nicht geladen werden", "error");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [action, actorEmail, page, pageSize, q, showToast, sortDir, sortField, targetEmail]);

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

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [data?.total, pageSize]);

  function setQuery(next: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    });
    sp.set("page", "1");
    router.push(`/admin/audit-logs?${sp.toString()}`);
  }

  function gotoPage(p: number) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", String(p));
    router.push(`/admin/audit-logs?${sp.toString()}`);
  }

  function toggleSort(field: "createdAt" | "action" | "actorEmail" | "targetEmail") {
    const sp = new URLSearchParams(searchParams.toString());
    const currentField = sp.get("sortField") || "createdAt";
    const currentDir = sp.get("sortDir") || "desc";

    const nextDir = currentField === field ? (currentDir === "desc" ? "asc" : "desc") : "asc";
    sp.set("sortField", field);
    sp.set("sortDir", nextDir);
    sp.set("page", "1");
    router.push(`/admin/audit-logs?${sp.toString()}`);
  }

  function sortIndicator(field: "createdAt" | "action" | "actorEmail" | "targetEmail") {
    if (sortField !== field) return "";
    return sortDir === "asc" ? "▲" : "▼";
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit-Log</h1>
      <AdminNav />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktion (exakt)</div>
            <select
              value={actionMode === "any" ? "" : actionMode === "preset" ? presetAction : "__custom__"}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  setActionMode("any");
                  setPresetAction("");
                  setActionInput("");
                } else if (v === "__custom__") {
                  setActionMode("custom");
                  setPresetAction("");
                  setActionInput(actionMode === "custom" ? actionInput : "");
                } else {
                  setActionMode("preset");
                  setPresetAction(v);
                  setActionInput(v);
                }
              }}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            >
              <option value="">Alle</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              <option value="__custom__">Benutzerdefiniert…</option>
            </select>

            {actionMode === "custom" ? (
              <input
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder='z.B. "USER_PASSWORD_RESET"'
                className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
              />
            ) : null}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin E-Mail</div>
            <input
              value={actorEmailInput}
              onChange={(e) => setActorEmailInput(e.target.value)}
              placeholder="admin@..."
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target E-Mail</div>
            <input
              value={targetEmailInput}
              onChange={(e) => setTargetEmailInput(e.target.value)}
              placeholder="user@..."
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Suche</div>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="action/backup..."
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setQuery({ action: actionInput.trim(), actorEmail: actorEmailInput.trim(), targetEmail: targetEmailInput.trim(), q: qInput.trim() })}
            className="px-3 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Filter anwenden
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/audit-logs")}
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {data ? `${data.total} Einträge` : "—"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => gotoPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 disabled:opacity-50"
            >
              Zurück
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-200">
              Seite {page} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => gotoPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-2 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Zeit <span className="text-xs">{sortIndicator("createdAt")}</span>
                  </button>
                </th>
                <th className="py-2 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort("action")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Aktion <span className="text-xs">{sortIndicator("action")}</span>
                  </button>
                </th>
                <th className="py-2 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort("actorEmail")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Admin <span className="text-xs">{sortIndicator("actorEmail")}</span>
                  </button>
                </th>
                <th className="py-2 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort("targetEmail")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Target <span className="text-xs">{sortIndicator("targetEmail")}</span>
                  </button>
                </th>
                <th className="py-2 px-4 whitespace-nowrap">Backup</th>
                <th className="py-2 px-4">Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(data?.items || []).map((it) => (
                <tr key={it.id} className="text-gray-800 dark:text-gray-200">
                  <td className="py-2 px-4 whitespace-nowrap">{new Date(it.createdAt).toLocaleString("de-DE")}</td>
                  <td className="py-2 px-4 font-mono text-xs whitespace-nowrap">{it.action}</td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    <div className="text-sm">{it.actorAdmin.name || "—"}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{it.actorAdmin.email}</div>
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {it.targetUser ? (
                      <div>
                        <div className="text-sm">{it.targetUser.name || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{it.targetUser.email}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-4 font-mono text-xs whitespace-nowrap">{it.targetBackupFilename || "—"}</td>
                  <td className="py-2 px-4">
                    {it.metadata ? (
                      <details>
                        <summary className="cursor-pointer select-none text-xs text-indigo-600 dark:text-indigo-300 hover:underline">
                          Anzeigen
                        </summary>
                        <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">
                          {JSON.stringify(it.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{safeJsonPreview(it.metadata) || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}

              {(data?.items || []).length === 0 ? (
                <tr>
                  <td className="py-8 px-4 text-sm text-gray-500 dark:text-gray-400" colSpan={6}>
                    Keine Einträge gefunden.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
