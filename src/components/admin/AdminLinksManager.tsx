"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import AdminLinkSuggestionsManager from "@/components/admin/AdminLinkSuggestionsManager";

type CategoryItem = { id: string; name: string; showOnMap: boolean };

type LinkRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  locationSource: string | null;
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

type EditDraft = {
  url: string;
  title: string;
  category: string;
  postalCode: string;
  city: string;
  status: string;
};

export default function AdminLinksManager() {
  const { showToast } = useToast();

  const [tab, setTab] = useState<"LINKS" | "SUGGESTIONS">("LINKS");

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [items, setItems] = useState<LinkRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("APPROVED");
  const [isActing, setIsActing] = useState<string>("");

  const [createUrl, setCreateUrl] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createPostalCode, setCreatePostalCode] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

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

  const setCategoryShowOnMap = async (c: CategoryItem, showOnMap: boolean) => {
    try {
      const res = await fetch(`/api/admin/link-categories/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_SHOW_ON_MAP", showOnMap }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }
      await loadCategories();
      showToast("OK", "success");
    } catch {
      showToast("Konnte nicht gespeichert werden", "error");
    }
  };

  const renameCategory = async (c: CategoryItem) => {
    const nameRaw = prompt("Kategorie umbenennen", c.name);
    const name = (nameRaw || "").trim();
    if (!name || name === c.name) return;

    try {
      const res = await fetch(`/api/admin/link-categories/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RENAME", name }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; name?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }
      await loadCategories();
      await load();
      showToast("OK", "success");
      if (typeof data?.name === "string") {
        if (createCategory === c.name) setCreateCategory(data.name);
        if (editDraft && editDraft.category === c.name) setEditDraft({ ...editDraft, category: data.name });
      }
    } catch {
      showToast("Konnte nicht gespeichert werden", "error");
    }
  };

  const deleteCategory = async (c: CategoryItem) => {
    if (!confirm(`Kategorie wirklich löschen? ${c.name}`)) return;
    try {
      const res = await fetch(`/api/admin/link-categories/${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Löschen fehlgeschlagen", "error");
        return;
      }
      await loadCategories();
      showToast("OK", "success");
      if (createCategory === c.name) setCreateCategory("");
      if (editDraft && editDraft.category === c.name) setEditDraft({ ...editDraft, category: "" });
    } catch {
      showToast("Löschen fehlgeschlagen", "error");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch("/api/admin/link-categories", { cache: "no-store" });
      const data = (await res.json().catch(() => [])) as unknown;
      if (!res.ok || !Array.isArray(data)) {
        setCategories([]);
        return;
      }
      setCategories(data as CategoryItem[]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const addCategory = async () => {
    const nameRaw = prompt("Neue Kategorie (z.B. Tanzschule)");
    const name = (nameRaw || "").trim();
    if (!name) return;

    try {
      const res = await fetch("/api/admin/link-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; name?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }
      await loadCategories();
      showToast("OK", "success");
      if (typeof data?.name === "string") {
        setCreateCategory(data.name);
        if (editDraft) {
          setEditDraft({ ...editDraft, category: data.name });
        }
      }
    } catch {
      showToast("Konnte nicht gespeichert werden", "error");
    }
  };

  const create = async () => {
    const url = createUrl.trim();
    const title = createTitle.trim();
    if (!url || !title) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title,
          category: createCategory.trim() || null,
          postalCode: createPostalCode.trim() || null,
          city: createCity.trim() || null,
          status: "APPROVED",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }

      setCreateUrl("");
      setCreateTitle("");
      setCreateCategory("");
      setCreatePostalCode("");
      setCreateCity("");
      await load();
      showToast("OK", "success");
    } finally {
      setIsCreating(false);
    }
  };

  const beginEdit = (x: LinkRow) => {
    setEditingId(x.id);
    setEditDraft({
      url: x.url,
      title: x.title,
      category: x.category || "",
      postalCode: x.postalCode || "",
      city: x.city || "",
      status: x.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    setIsActing(id);
    try {
      const res = await fetch(`/api/admin/links/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editDraft.url.trim(),
          title: editDraft.title.trim(),
          category: editDraft.category.trim() || null,
          postalCode: editDraft.postalCode.trim() || null,
          city: editDraft.city.trim() || null,
          status: editDraft.status,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }
      await load();
      showToast("OK", "success");
      cancelEdit();
    } finally {
      setIsActing("");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Link wirklich löschen?")) return;
    setIsActing(id);
    try {
      const res = await fetch(`/api/admin/links/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Löschen fehlgeschlagen", "error");
        return;
      }
      await load();
      showToast("OK", "success");
    } finally {
      setIsActing("");
    }
  };

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

    const isEditing = editingId === x.id;

    return (
      <div key={x.id} className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4 sm:px-6 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {isEditing && editDraft ? (
                <div className="space-y-2">
                  <input
                    value={editDraft.title}
                    onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  />
                  <input
                    value={editDraft.url}
                    onChange={(e) => setEditDraft({ ...editDraft, url: e.target.value })}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={editDraft.category}
                        onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                        className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm appearance-none"
                        disabled={isLoadingCategories}
                      >
                        <option value="">Keine Kategorie</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void addCategory()}
                        className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        +
                      </button>
                    </div>
                    <input
                      value={editDraft.postalCode}
                      onChange={(e) => setEditDraft({ ...editDraft, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                      placeholder="PLZ"
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                    />
                    <input
                      value={editDraft.city}
                      onChange={(e) => setEditDraft({ ...editDraft, city: e.target.value })}
                      placeholder="Ort"
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <>
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
                    {typeof x.lat === "number" && typeof x.lng === "number" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                        {x.lat.toFixed(3)}, {x.lng.toFixed(3)}
                      </span>
                    ) : null}
                  </div>
                  <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline break-all">
                    {x.url}
                  </a>
                </>
              )}
            </div>
            <div className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
              {isEditing && editDraft ? (
                <select
                  value={editDraft.status}
                  onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}
                  className="text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="OFFLINE">OFFLINE</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              ) : (
                x.status
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
            <div>eingereicht: {created}</div>
            <div>zuletzt geprüft: {checked}</div>
            <div>HTTP: {typeof x.lastStatusCode === "number" ? x.lastStatusCode : "-"} | fails: {x.consecutiveFailures}</div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {isEditing ? (
              <>
                <button
                  type="button"
                  disabled={isActing === x.id}
                  onClick={() => void saveEdit(x.id)}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  disabled={isActing === x.id}
                  onClick={cancelEdit}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-gray-800 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isActing === x.id}
                  onClick={() => beginEdit(x)}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-gray-800 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  disabled={isActing === x.id}
                  onClick={() => void remove(x.id)}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                >
                  Löschen
                </button>
              </>
            )}

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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("LINKS")}
          className={`px-3 py-2 rounded-md text-sm font-medium border ${
            tab === "LINKS"
              ? "border-indigo-300 bg-indigo-600 text-white"
              : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
          }`}
        >
          Links
        </button>
        <button
          type="button"
          onClick={() => setTab("SUGGESTIONS")}
          className={`px-3 py-2 rounded-md text-sm font-medium border ${
            tab === "SUGGESTIONS"
              ? "border-indigo-300 bg-indigo-600 text-white"
              : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
          }`}
        >
          Vorschläge
        </button>
      </div>

      {tab === "SUGGESTIONS" ? (
        <AdminLinkSuggestionsManager />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-4 sm:px-6 space-y-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Neuen Link anlegen</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Titel"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                />
                <input
                  value={createUrl}
                  onChange={(e) => setCreateUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm appearance-none"
                    disabled={isLoadingCategories}
                  >
                    <option value="">Keine Kategorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void addCategory()}
                    className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    +
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={createPostalCode}
                    onChange={(e) => setCreatePostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="PLZ"
                    className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  />
                  <input
                    value={createCity}
                    onChange={(e) => setCreateCity(e.target.value)}
                    placeholder="Ort"
                    className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={isCreating || !createUrl.trim() || !createTitle.trim()}
                onClick={() => void create()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCreating ? "Speichern..." : "Anlegen"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-4 sm:px-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Kategorien</div>
                <button
                  type="button"
                  onClick={() => void loadCategories()}
                  disabled={isLoadingCategories}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
                >
                  Aktualisieren
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">Vorhandene Kategorien (Dropdown)</div>
                <button
                  type="button"
                  onClick={() => void addCategory()}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  + Neu
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Keine Kategorien vorhanden.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                        <label className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={Boolean(c.showOnMap)}
                            onChange={(e) => void setCategoryShowOnMap(c, e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-700"
                          />
                          In Karte anzeigen
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void renameCategory(c)}
                          className="px-2 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                          Umbenennen
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteCategory(c)}
                          className="px-2 py-1 text-xs font-medium rounded-md border border-rose-300 dark:border-rose-800 bg-rose-600 text-white hover:bg-rose-700"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Links und Status</div>
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
        </>
      )}
    </div>
  );
}
