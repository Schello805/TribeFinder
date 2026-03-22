"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import { useToast } from "@/components/ui/Toast";

type Category = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  order: number;
};

type Item = {
  id: string;
  categoryId: string;
  category?: Category | null;
  title: string;
  description: string | null;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  const value = i === 0 ? String(Math.round(n)) : n.toFixed(1);
  return `${value} ${units[i]}`;
}

export default function AdminMarketingAssetsManager() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [newCategoryTitle, setNewCategoryTitle] = useState<string>("");
  const [newCategorySlug, setNewCategorySlug] = useState<string>("");
  const [newCategorySubtitle, setNewCategorySubtitle] = useState<string>("");
  const [newCategoryOrder, setNewCategoryOrder] = useState<string>("");

  const [categoryId, setCategoryId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resCats] = await Promise.all([
        fetch("/api/admin/marketing-assets", { cache: "no-store" }),
        fetch("/api/admin/marketing-asset-categories", { cache: "no-store" }),
      ]);

      const dataItems = (await resItems.json().catch(() => null)) as { items?: Item[]; message?: string } | null;
      const dataCats = (await resCats.json().catch(() => null)) as { items?: Category[]; message?: string } | null;

      if (!resItems.ok) throw new Error(dataItems?.message || `HTTP ${resItems.status}`);
      if (!resCats.ok) throw new Error(dataCats?.message || `HTTP ${resCats.status}`);

      const nextCats = Array.isArray(dataCats?.items) ? dataCats!.items : [];
      setCategories(nextCats);

      const nextItems = Array.isArray(dataItems?.items) ? dataItems!.items : [];
      setItems(nextItems);

      if (!categoryId && nextCats.length > 0) {
        setCategoryId(nextCats[0]!.id);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Laden", "error");
      setItems([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = useCallback(
    async (file: File) => {
      if (!title.trim()) {
        showToast("Bitte zuerst einen Titel eingeben.", "error");
        return;
      }
      if (!categoryId) {
        showToast("Bitte zuerst eine Kategorie auswählen.", "error");
        return;
      }
      setSaving(true);
      try {
        const fd = new FormData();
        fd.append("categoryId", categoryId);
        fd.append("title", title);
        fd.append("description", description);
        fd.append("file", file);

        const res = await fetch("/api/admin/marketing-assets", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

        setTitle("");
        setDescription("");
        showToast("Upload erfolgreich", "success");
        await load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Fehler beim Upload", "error");
      } finally {
        setSaving(false);
      }
    },
    [categoryId, description, load, showToast, title]
  );

  const onDelete = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/marketing-assets/${encodeURIComponent(id)}`, { method: "DELETE" });
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        showToast("Gelöscht", "success");
        await load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Fehler beim Löschen", "error");
      } finally {
        setSaving(false);
      }
    },
    [load, showToast]
  );

  const onCreateCategory = useCallback(async () => {
    if (!newCategoryTitle.trim()) {
      showToast("Bitte einen Titel eingeben.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing-asset-categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newCategoryTitle,
          slug: newCategorySlug,
          subtitle: newCategorySubtitle,
          order: newCategoryOrder ? Number(newCategoryOrder) : 0,
        }),
      });

      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      setNewCategoryTitle("");
      setNewCategorySlug("");
      setNewCategorySubtitle("");
      setNewCategoryOrder("");
      showToast("Kategorie angelegt", "success");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Anlegen", "error");
    } finally {
      setSaving(false);
    }
  }, [load, newCategoryOrder, newCategorySlug, newCategorySubtitle, newCategoryTitle, showToast]);

  const onDeleteCategory = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/marketing-asset-categories/${encodeURIComponent(id)}`, { method: "DELETE" });
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        showToast("Kategorie gelöscht", "success");
        await load();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Fehler beim Löschen", "error");
      } finally {
        setSaving(false);
      }
    },
    [load, showToast]
  );

  const grouped = useMemo(() => {
    const acc: Record<string, Item[]> = {};
    for (const item of items) {
      (acc[item.categoryId] ||= []).push(item);
    }
    return acc;
  }, [items]);

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Kategorien</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titel</label>
            <input
              type="text"
              value={newCategoryTitle}
              disabled={saving}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              placeholder="z.B. Social Templates"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug (optional)</label>
            <input
              type="text"
              value={newCategorySlug}
              disabled={saving}
              onChange={(e) => setNewCategorySlug(e.target.value)}
              placeholder="z.B. social"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Untertitel (optional)</label>
            <input
              type="text"
              value={newCategorySubtitle}
              disabled={saving}
              onChange={(e) => setNewCategorySubtitle(e.target.value)}
              placeholder="Kurze Beschreibung"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sortierung (optional)</label>
            <input
              type="number"
              value={newCategoryOrder}
              disabled={saving}
              onChange={(e) => setNewCategoryOrder(e.target.value)}
              placeholder="0"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onCreateCategory()}
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition"
          >
            Kategorie anlegen
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">Slug kann leer bleiben (wird automatisch erzeugt).</div>
        </div>

        {categories.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Noch keine Kategorien.</div>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <div className="font-medium text-gray-900 dark:text-white">{c.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">/{c.slug}</div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onDeleteCategory(c.id)}
                  className="ml-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-1.5 px-2 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Typ</label>
            <select
              value={categoryId}
              disabled={saving}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titel</label>
            <input
              type="text"
              value={title}
              disabled={saving}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. TribeFinder Logo (PNG)"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Beschreibung (optional)</label>
          <textarea
            value={description}
            disabled={saving}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Bitte warten..." : "Datei auswählen & hochladen"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              disabled={saving}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>

          <div className="text-xs text-gray-500 dark:text-gray-400">Max. 15MB • PNG/JPG/WebP/GIF/PDF</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Laden…</div>
      ) : (
        <div className="space-y-8">
          {categories.map((c) => (
            <div key={c.id} className="space-y-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {c.title} ({(grouped[c.id] || []).length})
              </div>
              {(grouped[c.id] || []).length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Keine Dateien.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(grouped[c.id] || []).map((item) => {
                    const url = normalizeUploadedImageUrl(item.fileUrl) || item.fileUrl;
                    const isPdf = (item.mimeType || "").toLowerCase().includes("pdf") || url.toLowerCase().endsWith(".pdf");
                    const isLogo = (item.category?.slug || c.slug) === "logo";
                    return (
                      <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden">
                        <div className="p-4 space-y-2">
                          <div className="font-semibold text-gray-900 dark:text-white line-clamp-2">{item.title}</div>
                          {item.description ? (
                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{item.description}</div>
                          ) : null}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.mimeType}
                            {item.sizeBytes ? ` • ${formatBytes(item.sizeBytes)}` : ""}
                          </div>
                        </div>

                        {isPdf ? (
                          <div className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">PDF Vorschau nicht eingebettet.</div>
                        ) : (
                          <div className="w-full bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
                            <Image
                              src={url}
                              alt={item.title}
                              width={1200}
                              height={800}
                              unoptimized
                              className={isLogo ? "w-full h-auto max-h-48 object-contain" : "w-full h-auto max-h-96 object-contain"}
                            />
                          </div>
                        )}

                        <div className="p-4 flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-indigo-600 hover:underline"
                          >
                            Öffnen
                          </a>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void onDelete(item.id)}
                            className="ml-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
