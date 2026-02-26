"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";

type SuggestionItem = {
  id: string;
  name: string;
  formerName: string | null;
  websiteUrl: string | null;
  videoUrl: string | null;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  decidedAt: string | null;
  createdBy: { id: string; email: string; name: string | null };
  decidedByAdmin: { id: string; email: string; name: string | null } | null;
  approvedStyle: { id: string; name: string } | null;
  style: { id: string; name: string } | null;
};

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export default function AdminDanceStyleSuggestionsManager() {
  const { showToast } = useToast();
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(() => items.filter((x) => x.status === "PENDING").length, [items]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/dance-style-suggestions", { cache: "no-store" });
      const data = (await res.json().catch(() => [])) as unknown;
      if (Array.isArray(data)) {
        setItems(data as SuggestionItem[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, action: "APPROVE" | "REJECT") => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/dance-style-suggestions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Aktion fehlgeschlagen", "error");
        return;
      }
      await load();
      showToast("Gespeichert", "success");
    } catch {
      showToast("Aktion fehlgeschlagen", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Vorschläge</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Offen: {pendingCount}</p>
          </div>
        </div>
      </div>

      <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.length === 0 ? (
          <li className="px-4 py-6 sm:px-6 text-sm text-gray-500 dark:text-gray-400">Keine Vorschläge vorhanden.</li>
        ) : (
          items.map((x) => (
            <li key={x.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{x.name}</div>
                  {x.formerName ? <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Früher: {x.formerName}</div> : null}
                  {x.websiteUrl ? (
                    <div className="mt-0.5 text-sm">
                      <a href={x.websiteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-300 hover:underline break-all">
                        {x.websiteUrl}
                      </a>
                    </div>
                  ) : null}
                  {x.videoUrl ? (
                    <div className="mt-0.5 text-sm">
                      <a href={x.videoUrl} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-300 hover:underline break-all">
                        {x.videoUrl}
                      </a>
                    </div>
                  ) : null}
                  {x.description ? <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{x.description}</div> : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {x.status === "PENDING" ? (
                      <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">PENDING</Badge>
                    ) : x.status === "APPROVED" ? (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">APPROVED</Badge>
                    ) : (
                      <Badge className="bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200">REJECTED</Badge>
                    )}

                    <Badge className="bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200">{x.createdBy.email}</Badge>

                    {x.style ? (
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">Edit: {x.style.name}</Badge>
                    ) : (
                      <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">Neu</Badge>
                    )}

                    {x.approvedStyle ? (
                      <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">Stil: {x.approvedStyle.name}</Badge>
                    ) : null}
                  </div>
                </div>

                {x.status === "PENDING" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === x.id}
                      onClick={() => void decide(x.id, "REJECT")}
                      className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Ablehnen
                    </button>
                    <button
                      type="button"
                      disabled={busyId === x.id}
                      onClick={() => void decide(x.id, "APPROVE")}
                      className="px-3 py-2 rounded-md text-sm font-medium border border-green-200 dark:border-green-800 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Freigeben
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
