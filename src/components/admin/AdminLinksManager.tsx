"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type LinkRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  submittedBy: { id: string; email: string; name: string | null };
  approvedBy: { id: string; email: string; name: string | null } | null;
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  consecutiveFailures: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminLinksManager() {
  const { showToast } = useToast();

  const [items, setItems] = useState<LinkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [isActing, setIsActing] = useState<string>("");

  const load = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/links?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok || !Array.isArray(data)) {
        showToast("Konnte Links nicht laden", "error");
        setItems([]);
        return;
      }
      setItems(data as LinkRow[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const grouped = useMemo(() => {
    const pending = items.filter((x) => x.status === "PENDING");
    const approved = items.filter((x) => x.status === "APPROVED");
    const rejected = items.filter((x) => x.status === "REJECTED");
    const offline = items.filter((x) => x.status === "OFFLINE");
    return { pending, approved, rejected, offline };
  }, [items]);

  const act = async (action: "APPROVE" | "REJECT" | "ARCHIVE" | "UNARCHIVE", id: string) => {
    setIsActing(id);
    try {
      const res = await fetch("/api/admin/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Aktion fehlgeschlagen", "error");
        return;
      }
      await load();
      showToast("OK", "success");
    } finally {
      setIsActing("");
    }
  };

  const renderRow = (x: LinkRow) => {
    const checked = x.lastCheckedAt ? new Date(x.lastCheckedAt).toLocaleDateString("de-DE") : "-";
    const created = x.createdAt ? new Date(x.createdAt).toLocaleDateString("de-DE") : "-";
    const locationText = [x.postalCode, x.city].filter(Boolean).join(" ");

    return (
      <div key={x.id} className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4 sm:px-6 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{x.title}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {x.category ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                    {x.category}
                  </span>
                ) : null}
                {locationText ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                    {locationText}
                  </span>
                ) : null}
              </div>
              <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline break-all">
                {x.url}
              </a>
            </div>
            <div className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
              {x.status}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
            <div>eingereicht: {created}</div>
            <div>zuletzt geprüft: {checked}</div>
            <div>HTTP: {typeof x.lastStatusCode === "number" ? x.lastStatusCode : "-"} | fails: {x.consecutiveFailures}</div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {x.status === "PENDING" ? (
              <>
                <button
                  type="button"
                  disabled={isActing === x.id}
                  onClick={() => act("APPROVE", x.id)}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Freigeben
                </button>
                <button
                  type="button"
                  disabled={isActing === x.id}
                  onClick={() => act("REJECT", x.id)}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                >
                  Ablehnen
                </button>
              </>
            ) : null}

            {x.status === "APPROVED" ? (
              <button
                type="button"
                disabled={isActing === x.id}
                onClick={() => act("ARCHIVE", x.id)}
                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-gray-800 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Ins Archiv
              </button>
            ) : null}

            {x.status === "OFFLINE" ? (
              <button
                type="button"
                disabled={isActing === x.id}
                onClick={() => act("UNARCHIVE", x.id)}
                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                Reaktivieren
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const visible = (() => {
    if (statusFilter === "PENDING") return grouped.pending;
    if (statusFilter === "APPROVED") return grouped.approved;
    if (statusFilter === "REJECTED") return grouped.rejected;
    if (statusFilter === "OFFLINE") return grouped.offline;
    return items;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Link-Vorschläge und Status</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="REJECTED">REJECTED</option>
            <option value="">Alle</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md shadow-sm text-gray-800 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Laden...</div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-gray-500">Keine Einträge.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">{visible.map(renderRow)}</div>
      )}
    </div>
  );
}
