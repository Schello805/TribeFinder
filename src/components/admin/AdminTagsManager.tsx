"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Tag = {
  id: string;
  name: string;
  isApproved: boolean;
  _count: { groups: number };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isTag(v: unknown): v is Tag {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.isApproved === "boolean" &&
    isRecord(v._count) &&
    typeof v._count.groups === "number"
  );
}

function applyTagUpdate(current: Tag, update: Record<string, unknown>): Tag {
  return {
    ...current,
    name: typeof update.name === "string" ? update.name : current.name,
    isApproved: typeof update.isApproved === "boolean" ? update.isApproved : current.isApproved,
    _count:
      isRecord(update._count) && typeof update._count.groups === "number"
        ? { groups: update._count.groups }
        : current._count,
  };
}

export default function AdminTagsManager() {
  const { showToast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tags");
      if (res.ok) {
        const data: unknown = await res.json().catch(() => null);
        setTags(Array.isArray(data) ? (data as unknown[]).filter(isTag) : []);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  const startEdit = (tag: Tag) => {
    setEditError("");
    setEditingTagId(tag.id);
    setEditingName(tag.name);
  };

  const cancelEdit = () => {
    setEditError("");
    setEditingTagId(null);
    setEditingName("");
  };

  const saveEdit = async (tag: Tag) => {
    const nextName = editingName.trim();
    if (!nextName) return;
    if (nextName === tag.name) {
      cancelEdit();
      return;
    }

    setIsSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const msg =
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : isRecord(data) && typeof data.message === "string"
              ? data.message
              : "Fehler beim Speichern";
        setEditError(msg);
        return;
      }

      const updated: unknown = await res.json().catch(() => null);
      if (!isRecord(updated)) {
        setEditError("Fehler beim Speichern");
        return;
      }
      setTags((prev) =>
        prev
          .map((t) => (t.id === tag.id ? applyTagUpdate(t, updated) : t))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEdit();
    } catch (error) {
      console.error("Error renaming tag:", error);
      setEditError("Fehler beim Speichern");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const addTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName, isApproved: true }),
      });

      if (res.ok) {
        const newTag: unknown = await res.json().catch(() => null);
        if (!isRecord(newTag)) {
          showToast("Fehler beim Hinzufügen", "error");
          return;
        }

        const newId = newTag.id;
        if (typeof newId !== "string") {
          showToast("Fehler beim Hinzufügen", "error");
          return;
        }

        const newName = typeof newTag.name === "string" ? newTag.name : newId;
        const newApproved = typeof newTag.isApproved === "boolean" ? newTag.isApproved : true;
        setTags((prev) => {
          const exists = prev.find((t) => t.id === newId);
          if (exists) {
            return prev.map((t) => (t.id === newId ? applyTagUpdate(t, newTag) : t));
          }
          const created: Tag = {
            id: newId,
            name: newName,
            isApproved: newApproved,
            _count: { groups: 0 },
          };
          return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
        });
        setNewTagName("");
        showToast("Tag hinzugefügt", "success");
      } else {
        showToast("Fehler beim Hinzufügen", "error");
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentStatus }),
      });

      if (res.ok) {
        setTags((prev) => prev.map((tag) => (tag.id === id ? { ...tag, isApproved: !currentStatus } : tag)));
      }
    } catch (error) {
      console.error("Error updating tag:", error);
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Bist du sicher? Dieser Tag wird von allen Gruppen entfernt.")) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTags((prev) => prev.filter((tag) => tag.id !== id));
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6 p-4 border border-transparent dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Neuen Tanzstil hinzufügen</h2>
        <form onSubmit={addTag} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="z.B. Tribal Fusion, ATS (FCBDStyle)..."
            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={isAdding || !newTagName.trim()}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 min-h-11"
          >
            {isAdding ? "Speichere..." : "Hinzufügen"}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {tags.map((tag) => (
            <li key={tag.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <div className="min-w-0">
                  {editingTagId === tag.id ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full sm:w-64 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        disabled={isSavingEdit}
                        autoFocus
                      />
                      <button
                        onClick={() => void saveEdit(tag)}
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
                  ) : (
                    <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{tag.name}</div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Verwendet von {tag._count?.groups || 0} Gruppen</div>
                  {editingTagId === tag.id && editError && <div className="text-sm text-red-600 mt-1">{editError}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    tag.isApproved
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {tag.isApproved ? "Aktiv" : "Ausstehend"}
                </span>

                <button
                  onClick={() => (editingTagId === tag.id ? cancelEdit() : startEdit(tag))}
                  disabled={isSavingEdit || editingTagId !== null}
                  className="px-3 py-2 rounded text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 disabled:opacity-50"
                >
                  Bearbeiten
                </button>

                <button
                  onClick={() => void toggleApproval(tag.id, tag.isApproved)}
                  className={`text-sm font-medium ${
                    tag.isApproved
                      ? "text-orange-600 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-200"
                      : "text-green-600 dark:text-green-300 hover:text-green-900 dark:hover:text-green-200"
                  }`}
                >
                  {tag.isApproved ? "Deaktivieren" : "Freigeben"}
                </button>

                <button
                  onClick={() => void deleteTag(tag.id)}
                  className="px-3 py-2 rounded text-sm font-medium text-red-600 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200"
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
          {tags.length === 0 && <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Keine Tags gefunden.</li>}
        </ul>
      </div>
    </>
  );
}
