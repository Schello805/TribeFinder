"use client";

import { useEffect, useMemo, useState } from "react";

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";
type Mode = "IMPRO" | "CHOREO" | "BOTH" | null;

type DanceStyle = {
  id: string;
  name: string;
  category: string | null;
};

type GroupDanceStyleValue = {
  styleId: string;
  level: Level;
  mode?: Mode;
};

const LEVEL_LABEL: Record<Level, string> = {
  BEGINNER: "Anfänger",
  INTERMEDIATE: "Fortgeschritten",
  ADVANCED: "Sehr fortgeschritten",
  PROFESSIONAL: "Profi",
};

const MODE_LABEL: Record<Exclude<Mode, null>, string> = {
  IMPRO: "Impro",
  CHOREO: "Choreo",
  BOTH: "Beides",
};

export default function GroupDanceStylesEditor({
  value,
  onChange,
  disabled,
}: {
  value: GroupDanceStyleValue[];
  onChange: (next: GroupDanceStyleValue[]) => void;
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [available, setAvailable] = useState<DanceStyle[]>([]);
  const [message, setMessage] = useState("");

  const [newStyleId, setNewStyleId] = useState<string>("");
  const [newLevel, setNewLevel] = useState<Level>("BEGINNER");
  const [newMode, setNewMode] = useState<Mode>(null);

  const selectedIds = useMemo(() => new Set(value.map((s) => s.styleId)), [value]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dance-styles");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.message || "Fehler beim Laden der Tanzstile");
        setAvailable([]);
        return;
      }
      setAvailable(data.available || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const availableFiltered = useMemo(
    () => available.filter((s) => !selectedIds.has(s.id)),
    [available, selectedIds]
  );

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of available) map.set(s.id, s.name);
    return map;
  }, [available]);

  const add = () => {
    if (!newStyleId) return;
    if (selectedIds.has(newStyleId)) return;

    const next = [...value, { styleId: newStyleId, level: newLevel, mode: newMode }].sort((a, b) => {
      const an = nameById.get(a.styleId) || "";
      const bn = nameById.get(b.styleId) || "";
      return an.localeCompare(bn);
    });
    onChange(next);
    setNewStyleId("");
    setNewLevel("BEGINNER");
    setNewMode(null);
    setMessage("");
  };

  const updateLevel = (styleId: string, level: Level) => {
    onChange(value.map((x) => (x.styleId === styleId ? { ...x, level } : x)));
  };

  const updateMode = (styleId: string, mode: Mode) => {
    onChange(value.map((x) => (x.styleId === styleId ? { ...x, mode } : x)));
  };

  const remove = (styleId: string) => {
    onChange(value.filter((x) => x.styleId !== styleId));
  };

  if (isLoading) {
    return <div className="p-2 text-sm text-[var(--muted)]">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--surface-2)] p-4 rounded-md border border-[var(--border)]">
        <div className="text-sm font-medium text-[var(--muted)] min-h-[1.5rem]">{message}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">Tanzstil hinzufügen</label>
            <select
              value={newStyleId}
              onChange={(e) => setNewStyleId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
              disabled={disabled}
            >
              <option value="">Bitte auswählen…</option>
              {availableFiltered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
              disabled={disabled}
            >
              {(Object.keys(LEVEL_LABEL) as Level[]).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {LEVEL_LABEL[lvl]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Art</label>
            <select
              value={newMode ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setNewMode(v === "" ? null : (v as Exclude<Mode, null>));
              }}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
              disabled={disabled}
            >
              <option value="">Keine Angabe</option>
              {(Object.keys(MODE_LABEL) as Array<Exclude<Mode, null>>).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={add}
            disabled={disabled || !newStyleId}
            className="inline-flex justify-center rounded-md border border-transparent bg-[var(--primary)] py-2 px-4 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] text-[var(--foreground)] shadow sm:rounded-lg p-4 border border-[var(--border)]">
        <h3 className="tf-display text-base font-medium text-[var(--foreground)] mb-3">Tanzstile der Gruppe</h3>
        {value.length === 0 ? (
          <div className="text-[var(--muted)]">Noch keine Tanzstile ausgewählt.</div>
        ) : (
          <div className="space-y-3">
            {value
              .slice()
              .sort((a, b) => (nameById.get(a.styleId) || "").localeCompare(nameById.get(b.styleId) || ""))
              .map((s) => (
                <div
                  key={s.styleId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--foreground)]">
                      {nameById.get(s.styleId) || s.styleId}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <select
                      value={s.level}
                      onChange={(e) => updateLevel(s.styleId, e.target.value as Level)}
                      disabled={disabled}
                      className="w-full sm:w-auto rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
                    >
                      {(Object.keys(LEVEL_LABEL) as Level[]).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {LEVEL_LABEL[lvl]}
                        </option>
                      ))}
                    </select>

                    <select
                      value={s.mode ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateMode(s.styleId, v === "" ? null : (v as Exclude<Mode, null>));
                      }}
                      disabled={disabled}
                      className="w-full sm:w-auto rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2 appearance-none"
                    >
                      <option value="">Keine Angabe</option>
                      {(Object.keys(MODE_LABEL) as Array<Exclude<Mode, null>>).map((m) => (
                        <option key={m} value={m}>
                          {MODE_LABEL[m]}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => remove(s.styleId)}
                      disabled={disabled}
                      className="w-full sm:w-auto inline-flex justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] py-2 px-3 text-sm font-medium text-red-700 shadow-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
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
