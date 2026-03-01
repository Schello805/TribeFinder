"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import WhatsNewPreviewModal from "@/components/announcements/WhatsNewPreviewModal";

type Item = {
  id: string;
  title: string;
  bullets: unknown;
  showFrom: string;
  showUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function toIsoInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateFromInput(v: string) {
  const s = (v || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function bulletsToText(bullets: unknown) {
  if (Array.isArray(bullets)) {
    return bullets.map((x) => (typeof x === "string" ? x : "")).filter(Boolean).join("\n");
  }
  return "";
}

function isActiveNow(item: Item, now: Date) {
  if (!item.isActive) return false;
  const from = new Date(item.showFrom);
  if (Number.isNaN(from.getTime())) return false;
  if (from.getTime() > now.getTime()) return false;
  if (!item.showUntil) return true;
  const until = new Date(item.showUntil);
  if (Number.isNaN(until.getTime())) return true;
  return until.getTime() >= now.getTime();
}

export default function AdminAnnouncementsManager() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [bullets, setBullets] = useState<string>("");
  const [showFrom, setShowFrom] = useState<string>(() => toIsoInputValue(new Date()));
  const [showUntilEnabled, setShowUntilEnabled] = useState<boolean>(false);
  const [showUntil, setShowUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toIsoInputValue(d);
  });
  const [isActive, setIsActive] = useState<boolean>(true);

  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { items?: Item[]; message?: string } | null;
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setItems(Array.isArray(data?.items) ? data!.items : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Laden", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeNowCount = useMemo(() => {
    const now = new Date();
    return items.filter((i) => isActiveNow(i, now)).length;
  }, [items]);

  const resetForm = useCallback(() => {
    setEditingId("");
    setTitle("");
    setBullets("");
    setShowFrom(toIsoInputValue(new Date()));
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setShowUntil(toIsoInputValue(d));
    setShowUntilEnabled(false);
    setIsActive(true);
  }, []);

  const startEdit = useCallback((item: Item) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setBullets(bulletsToText(item.bullets));
    setShowFrom(toIsoInputValue(new Date(item.showFrom)));
    if (item.showUntil) {
      setShowUntilEnabled(true);
      setShowUntil(toIsoInputValue(new Date(item.showUntil)));
    } else {
      setShowUntilEnabled(false);
    }
    setIsActive(Boolean(item.isActive));
  }, []);

  const save = useCallback(async () => {
    const showFromDate = toDateFromInput(showFrom);
    const showUntilDate = showUntilEnabled ? toDateFromInput(showUntil) : null;

    if (!title.trim()) {
      showToast("Titel fehlt", "error");
      return;
    }

    const bulletLines = bullets
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    if (bulletLines.length === 0) {
      showToast("Bitte mindestens einen Bulletpoint angeben", "error");
      return;
    }

    if (!showFromDate) {
      showToast("Startdatum ungültig", "error");
      return;
    }

    if (showUntilEnabled && !showUntilDate) {
      showToast("Enddatum ungültig", "error");
      return;
    }

    if (showUntilEnabled && showUntilDate && showUntilDate.getTime() < showFromDate.getTime()) {
      showToast("Enddatum muss nach dem Startdatum liegen", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        bullets: bulletLines,
        showFrom: showFromDate.toISOString(),
        showUntil: showUntilEnabled && showUntilDate ? showUntilDate.toISOString() : null,
        isActive,
      };

      const res = await fetch(editingId ? `/api/admin/announcements/${encodeURIComponent(editingId)}` : "/api/admin/announcements", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      showToast("Gespeichert", "success");
      resetForm();
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Speichern", "error");
    } finally {
      setSaving(false);
    }
  }, [bullets, editingId, isActive, load, resetForm, showFrom, showToast, showUntil, showUntilEnabled, title]);

  const previewBullets = useMemo(
    () =>
      bullets
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => x.length > 0),
    [bullets]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Wirklich löschen?")) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, { method: "DELETE" });
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        showToast("Gelöscht", "success");
        await load();
        if (editingId === id) resetForm();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Fehler beim Löschen", "error");
      } finally {
        setSaving(false);
      }
    },
    [editingId, load, resetForm, showToast]
  );

  return (
    <div className="space-y-6">
      <WhatsNewPreviewModal
        open={previewOpen}
        title={title.trim()}
        bullets={previewBullets}
        onClose={() => setPreviewOpen(false)}
      />

      {activeNowCount > 1 ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 px-4 py-3 text-sm">
          Achtung: Es sind aktuell mehrere aktive Ankündigungen gleichzeitig im Zeitfenster. Benutzer sehen nur die neueste.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 space-y-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {editingId ? "Ankündigung bearbeiten" : "Neue Ankündigung"}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Titel</label>
            <input
              type="text"
              value={title}
              disabled={saving}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bulletpoints (1 Zeile = 1 Punkt)</label>
            <textarea
              value={bullets}
              disabled={saving}
              onChange={(e) => setBullets(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Anzeigen ab</label>
              <input
                type="datetime-local"
                value={showFrom}
                disabled={saving}
                onChange={(e) => setShowFrom(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Anzeigen bis</label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showUntilEnabled}
                  disabled={saving}
                  onChange={(e) => setShowUntilEnabled(e.target.checked)}
                />
                Enddatum setzen
              </label>
              <input
                type="datetime-local"
                value={showUntil}
                disabled={saving || !showUntilEnabled}
                onChange={(e) => setShowUntil(e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 14);
                  setShowUntilEnabled(true);
                  setShowUntil(toIsoInputValue(d));
                }}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
              >
                Ende in 14 Tagen
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isActive}
              disabled={saving}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Aktiv
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Bitte warten…" : "Speichern"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Vorschau
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 space-y-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Vorhandene Ankündigungen</div>
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Laden…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Noch keine Ankündigungen.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const now = new Date();
                const active = isActiveNow(it, now);
                return (
                  <div key={it.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{it.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {active ? "Aktiv (jetzt)" : it.isActive ? "Aktiv (außerhalb Zeitraum)" : "Inaktiv"}
                          {" • "}
                          {new Date(it.showFrom).toLocaleString("de-DE")}
                          {it.showUntil ? ` → ${new Date(it.showUntil).toLocaleString("de-DE")}` : ""}
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => startEdit(it)}
                          className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void remove(it.id)}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
