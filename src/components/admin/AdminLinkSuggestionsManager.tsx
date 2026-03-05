"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";

type SuggestionItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  createdAt: string;
  decidedAt: string | null;
  createdBy: { id: string; email: string; name: string | null };
  decidedByAdmin: { id: string; email: string; name: string | null } | null;
  link: { id: string; url: string; title: string; category: string | null; postalCode: string | null; city: string | null };
};

function normalize(v: string | null | undefined): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : "—";
}

function FieldDiff({ label, oldValue, newValue }: { label: string; oldValue: string | null | undefined; newValue: string | null | undefined }) {
  const oldN = normalize(oldValue);
  const newN = normalize(newValue);
  const changed = oldN !== newN;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-start">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 break-words">
        <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Alt</div>
        <div className={changed ? "" : "opacity-70"}>{oldN}</div>
      </div>
      <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
        <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Neu</div>
        <div className={changed ? "font-semibold" : "opacity-70"}>{newN}</div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

export default function AdminLinkSuggestionsManager() {
  const { showToast } = useToast();
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(() => items.filter((x) => x.status === "PENDING").length, [items]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/link-suggestions", { cache: "no-store" });
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
      const res = await fetch(`/api/admin/link-suggestions/${encodeURIComponent(id)}`, {
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
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Link-Vorschläge</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Offen: {pendingCount}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Aktualisieren
          </button>
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
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{x.link.title}</div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 break-all">{x.link.url}</div>

                  <div className="mt-3 space-y-3">
                    <FieldDiff label="Titel" oldValue={x.link.title} newValue={x.title} />
                    <FieldDiff label="URL" oldValue={x.link.url} newValue={x.url} />
                    <FieldDiff label="Kategorie" oldValue={x.link.category} newValue={x.category} />
                    <FieldDiff label="PLZ" oldValue={x.link.postalCode} newValue={x.postalCode} />
                    <FieldDiff label="Ort" oldValue={x.link.city} newValue={x.city} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {x.status === "PENDING" ? (
                      <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">PENDING</Badge>
                    ) : x.status === "APPROVED" ? (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">APPROVED</Badge>
                    ) : (
                      <Badge className="bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200">REJECTED</Badge>
                    )}

                    <Badge className="bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200">{x.createdBy.email}</Badge>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">Edit</Badge>
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
