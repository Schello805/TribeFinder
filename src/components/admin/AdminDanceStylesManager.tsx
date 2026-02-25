"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

const CATEGORY_OPTIONS = [
  "Oriental",
  "Tribal",
  "Fusion",
  "Folklore",
  "Modern",
  "Sonstiges",
] as const;

type DanceStyleItem = {
  id: string;
  name: string;
  category: string | null;
  formerName?: string | null;
  websiteUrl?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  _count: { groups: number; users: number };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isItem(v: unknown): v is DanceStyleItem {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.name !== "string") return false;
  if (!("_count" in v) || !isRecord(v._count)) return false;
  const c = v._count as Record<string, unknown>;
  return typeof c.groups === "number" && typeof c.users === "number";
}

export default function AdminDanceStylesManager() {
  const { showToast } = useToast();
  const [items, setItems] = useState<DanceStyleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newFormerName, setNewFormerName] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editingFormerName, setEditingFormerName] = useState("");
  const [editingWebsiteUrl, setEditingWebsiteUrl] = useState("");
  const [editingVideoUrl, setEditingVideoUrl] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/dance-styles", { cache: "no-store" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
            ? (data as { message: string }).message
            : "Fehler beim Laden";
        setItems([]);
        setLoadError(msg);
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

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/dance-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: newCategory.trim() || null,
          formerName: newFormerName.trim() || null,
          websiteUrl: newWebsiteUrl.trim() || null,
          videoUrl: newVideoUrl.trim() || null,
          description: newDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Fehler beim Hinzufügen", "error");
        return;
      }
      setNewName("");
      setNewCategory("");
      setNewFormerName("");
      setNewWebsiteUrl("");
      setNewVideoUrl("");
      setNewDescription("");
      await load();
      showToast("Gespeichert", "success");
    } catch {
      showToast("Fehler beim Hinzufügen", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (x: DanceStyleItem) => {
    setEditingId(x.id);
    setEditingName(x.name);
    setEditingCategory(x.category || "");
    setEditingFormerName(x.formerName || "");
    setEditingWebsiteUrl(x.websiteUrl || "");
    setEditingVideoUrl(x.videoUrl || "");
    setEditingDescription(x.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingCategory("");
    setEditingFormerName("");
    setEditingWebsiteUrl("");
    setEditingVideoUrl("");
    setEditingDescription("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/dance-styles/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: editingCategory.trim() || null,
          formerName: editingFormerName.trim() || null,
          websiteUrl: editingWebsiteUrl.trim() || null,
          videoUrl: editingVideoUrl.trim() || null,
          description: editingDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Fehler beim Speichern", "error");
        return;
      }
      cancelEdit();
      await load();
      showToast("Gespeichert", "success");
    } catch {
      showToast("Fehler beim Speichern", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const del = async (x: DanceStyleItem) => {
    if (!confirm(`Bist du sicher? Tanzstil wird aus allen Gruppen/Tänzerinnen entfernt: ${x.name}`)) return;
    try {
      const res = await fetch(`/api/admin/dance-styles/${encodeURIComponent(x.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Fehler beim Löschen", "error");
        return;
      }
      await load();
      showToast("Gelöscht", "success");
    } catch {
      showToast("Fehler beim Löschen", "error");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {loadError}
        </div>
      ) : null}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6 p-4 border border-transparent dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Neuen Tanzstil hinzufügen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="z.B. Tribal Fusion, ATS (FCBDStyle)..."
            className="flex-1 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 min-h-11 appearance-none rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="">Keine Kategorie</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newFormerName}
            onChange={(e) => setNewFormerName(e.target.value)}
            placeholder="Früherer Name (optional)"
            className="flex-1 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <input
            type="text"
            value={newWebsiteUrl}
            onChange={(e) => setNewWebsiteUrl(e.target.value)}
            placeholder="Website (optional)"
            className="flex-1 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <input
            type="text"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            placeholder="Video URL (optional)"
            className="flex-1 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="flex-1 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <div className="sm:col-span-2 flex justify-end">
          <button
            type="button"
            onClick={() => void add()}
            disabled={isAdding || !newName.trim()}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 min-h-11"
          >
            {isAdding ? "Speichere..." : "Hinzufügen"}
          </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {sorted.map((x) => (
            <li
              key={x.id}
              className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/40"
            >
              <div className="min-w-0">
                {editingId === x.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full sm:w-64 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      disabled={isSavingEdit}
                      autoFocus
                    />
                    <select
                      value={editingCategory}
                      onChange={(e) => setEditingCategory(e.target.value)}
                      className="w-full sm:w-64 min-h-11 appearance-none rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100"
                      disabled={isSavingEdit}
                    >
                      <option value="">Keine Kategorie</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editingFormerName}
                      onChange={(e) => setEditingFormerName(e.target.value)}
                      className="w-full sm:w-64 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      disabled={isSavingEdit}
                      placeholder="Früherer Name (optional)"
                    />
                    <input
                      type="text"
                      value={editingWebsiteUrl}
                      onChange={(e) => setEditingWebsiteUrl(e.target.value)}
                      className="w-full sm:w-64 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      disabled={isSavingEdit}
                      placeholder="Website (optional)"
                    />
                    <input
                      type="text"
                      value={editingVideoUrl}
                      onChange={(e) => setEditingVideoUrl(e.target.value)}
                      className="w-full sm:w-64 min-h-11 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      disabled={isSavingEdit}
                      placeholder="Video URL (optional)"
                    />
                    </div>
                    <textarea
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[80px]"
                      disabled={isSavingEdit}
                      placeholder="Beschreibung (optional)"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void saveEdit()}
                        disabled={isSavingEdit || !editingName.trim()}
                        className="px-3 py-2 rounded text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 disabled:opacity-50"
                      >
                        Speichern
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                        className="px-3 py-2 rounded text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{x.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Verwendet von {x._count.groups} Gruppen, {x._count.users} Tänzerinnen
                    </div>
                    {x.category ? <div className="text-xs text-gray-500 dark:text-gray-400">Kategorie: {x.category}</div> : null}
                    {x.formerName ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Früherer Name: {x.formerName}</div>
                    ) : null}
                    {x.websiteUrl ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 break-all">Website: {x.websiteUrl}</div>
                    ) : null}
                    {x.videoUrl ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 break-all">Video: {x.videoUrl}</div>
                    ) : null}
                    {x.description ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{x.description}</div>
                    ) : null}
                  </>
                )}
              </div>

              {editingId === x.id ? null : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => startEdit(x)}
                    disabled={editingId !== null}
                    className="px-3 py-2 rounded text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 disabled:opacity-50"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => void del(x)}
                    className="px-3 py-2 rounded text-sm font-medium text-red-600 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200"
                  >
                    Löschen
                  </button>
                </div>
              )}
            </li>
          ))}
          {sorted.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Keine Tanzstile gefunden.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
