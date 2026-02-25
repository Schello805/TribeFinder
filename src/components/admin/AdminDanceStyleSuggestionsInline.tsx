"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type SuggestionItem = {
  id: string;
  name: string;
  category?: string | null;
  formerName: string | null;
  websiteUrl: string | null;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  createdBy: { id: string; email: string; name: string | null };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isItem(v: unknown): v is SuggestionItem {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.status === "string" &&
    typeof v.createdAt === "string" &&
    isRecord(v.createdBy) &&
    typeof (v.createdBy as Record<string, unknown>).email === "string"
  );
}

export default function AdminDanceStyleSuggestionsInline() {
  const { showToast } = useToast();
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pending = useMemo(() => items.filter((x) => x.status === "PENDING"), [items]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/dance-style-suggestions", { cache: "no-store" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        return;
      }
      setItems(Array.isArray(data) ? (data as unknown[]).filter(isItem) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, action: "APPROVE" | "REJECT") => {
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
    }
  };

  if (isLoading) return null;
  if (pending.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Neue Tanzstil-Vorschläge</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Offen: {pending.length}</p>
      </div>

      <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
        {pending.map((x) => (
          <li key={x.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{x.name}</div>
                {x.category ? (
                  <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Kategorie: {x.category}</div>
                ) : null}
                {x.formerName ? (
                  <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Früher: {x.formerName}</div>
                ) : null}
                {x.websiteUrl ? (
                  <div className="mt-0.5 text-sm">
                    <a
                      href={x.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-300 hover:underline break-all"
                    >
                      {x.websiteUrl}
                    </a>
                  </div>
                ) : null}
                {x.description ? (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{x.description}</div>
                ) : null}

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Von: {x.createdBy.email}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void decide(x.id, "REJECT")}
                  className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Ablehnen
                </button>
                <button
                  type="button"
                  onClick={() => void decide(x.id, "APPROVE")}
                  className="px-3 py-2 rounded-md text-sm font-medium border border-green-200 dark:border-green-800 bg-green-600 text-white hover:bg-green-700"
                >
                  Freigeben
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
