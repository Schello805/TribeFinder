"use client";

import { useEffect, useMemo, useState } from "react";

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";

type DanceStyle = {
  id: string;
  name: string;
  category: string | null;
  aliases?: Array<{ name: string }>;
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

  const optionList = useMemo(() => {
    const out: Array<{ key: string; value: string; label: string }> = [];
    for (const s of filteredAvailable) {
      out.push({ key: `style:${s.id}`, value: s.id, label: s.name });
      for (const a of s.aliases ?? []) {
        const alias = (a?.name || "").trim();
        if (!alias) continue;
        out.push({ key: `alias:${s.id}:${alias}`, value: s.id, label: `${alias} (Alias von ${s.name})` });
      }
    }
    return out;
  }, [filteredAvailable]);

  if (isLoading) {
    return <div className="p-6 text-center text-[var(--foreground)]">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--surface)] text-[var(--foreground)] shadow sm:rounded-lg p-6 space-y-4 border border-[var(--border)]">
        <div className="text-sm font-medium text-green-600 min-h-[1.5rem]">{message}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">Tanzstil hinzufügen</label>
            <select
              value={newStyleId}
              onChange={(e) => setNewStyleId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
              disabled={isSaving}
            >
              <option value="">Bitte auswählen…</option>
              {optionList.map((o) => (
                <option key={o.key} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Level</label>
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as Level)}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
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
            className="inline-flex justify-center rounded-md border border-transparent bg-[var(--primary)] py-2 px-4 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] text-[var(--foreground)] shadow sm:rounded-lg p-6 border border-[var(--border)]">
        <h3 className="tf-display text-lg font-medium text-[var(--foreground)] mb-4">Deine Tanzstile</h3>
        {selected.length === 0 ? (
          <div className="text-[var(--muted)]">Noch keine Tanzstile ausgewählt.</div>
        ) : (
          <div className="space-y-3">
            {selected.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-3">
                <div className="min-w-0">
                  <div className="font-medium text-[var(--foreground)]">{s.style.name}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={s.level}
                    onChange={(e) => updateLevel(s.id, e.target.value as Level)}
                    disabled={isSaving}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
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
                    className="inline-flex justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] py-2 px-3 text-sm font-medium text-red-700 shadow-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
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
