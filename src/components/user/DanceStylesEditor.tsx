"use client";

import { useEffect, useMemo, useState } from "react";

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";

type DanceStyle = {
  id: string;
  name: string;
  category: string | null;
};

type UserDanceStyle = {
  id: string;
  level: Level;
  style: DanceStyle;
};

const LEVEL_LABEL: Record<Level, string> = {
  BEGINNER: "Anfänger",
  INTERMEDIATE: "Fortgeschritten",
  ADVANCED: "Sehr fortgeschritten",
  PROFESSIONAL: "Profi",
};

export default function DanceStylesEditor() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [available, setAvailable] = useState<DanceStyle[]>([]);
  const [selected, setSelected] = useState<UserDanceStyle[]>([]);

  const [newStyleId, setNewStyleId] = useState<string>("");
  const [newLevel, setNewLevel] = useState<Level>("BEGINNER");

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.style.id)), [selected]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/dance-styles");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.message || data?.error || "Fehler beim Laden der Tanzstile");
        return;
      }
      setAvailable(data.available || []);
      setSelected(data.selected || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!newStyleId) return;
    setIsSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/dance-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId: newStyleId, level: newLevel }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Fehler beim Hinzufügen");
        return;
      }

      setSelected((prev) => [...prev, data].sort((a, b) => a.style.name.localeCompare(b.style.name)));
      setNewStyleId("");
      setNewLevel("BEGINNER");
      setMessage("Hinzugefügt!");
      setTimeout(() => setMessage(""), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateLevel = async (userStyleId: string, level: Level) => {
    setIsSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/dance-styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userStyleId, level }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Fehler beim Speichern");
        return;
      }

      setSelected((prev) => prev.map((s) => (s.id === userStyleId ? data : s)));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (userStyleId: string) => {
    setIsSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/dance-styles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userStyleId }),
      });

      if (!res.ok) {
        setMessage("Fehler beim Entfernen");
        return;
      }

      setSelected((prev) => prev.filter((s) => s.id !== userStyleId));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAvailable = useMemo(
    () => available.filter((a) => !selectedIds.has(a.id)),
    [available, selectedIds]
  );

  if (isLoading) {
    return <div className="p-6 text-center text-gray-700 dark:text-gray-200">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700">
        <div className="text-sm font-medium text-green-600 min-h-[1.5rem]">{message}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tanzstil hinzufügen</label>
            <select
              value={newStyleId}
              onChange={(e) => setNewStyleId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border appearance-none"
              disabled={isSaving}
            >
              <option value="">Bitte auswählen…</option>
              {filteredAvailable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Level</label>
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as Level)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border appearance-none"
              disabled={isSaving}
            >
              {(Object.keys(LEVEL_LABEL) as Level[]).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {LEVEL_LABEL[lvl]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={add}
            disabled={isSaving || !newStyleId}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="tf-display text-lg font-medium text-gray-900 dark:text-white mb-4">Deine Tanzstile</h3>
        {selected.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-300">Noch keine Tanzstile ausgewählt.</div>
        ) : (
          <div className="space-y-3">
            {selected.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 flex-wrap border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white">{s.style.name}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={s.level}
                    onChange={(e) => updateLevel(s.id, e.target.value as Level)}
                    disabled={isSaving}
                    className="rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border appearance-none"
                  >
                    {(Object.keys(LEVEL_LABEL) as Level[]).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {LEVEL_LABEL[lvl]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    disabled={isSaving}
                    className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 px-3 text-sm font-medium text-red-700 dark:text-red-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
