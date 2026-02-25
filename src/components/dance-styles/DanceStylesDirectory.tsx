"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type StyleItem = {
  id: string;
  name: string;
  category: string | null;
  groups: number;
  dancers: number;
};

export default function DanceStylesDirectory({ styles }: { styles: StyleItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return styles;
    return styles.filter((s) => s.name.toLowerCase().includes(q));
  }, [query, styles]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Suche</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2"
          placeholder="Tanzstil suchen…"
        />
      </div>

      <div className="divide-y divide-[var(--border)]">
        {filtered.map((s) => (
          <div key={s.id} className="py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link href={`/dance-styles/${encodeURIComponent(s.id)}`} className="font-medium text-[var(--foreground)] truncate hover:underline">
                {s.name}
              </Link>
              {s.category ? <div className="text-xs text-[var(--muted)]">{s.category}</div> : null}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span
                title={`Gruppen: ${s.groups}`}
                className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-[11px] sm:text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)]"
              >
                <span className="sr-only sm:not-sr-only">Gruppen: </span>
                {s.groups}
              </span>
              <span
                title={`Tänzerinnen: ${s.dancers}`}
                className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-[11px] sm:text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)]"
              >
                <span className="sr-only sm:not-sr-only">Tänzerinnen: </span>
                {s.dancers}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="py-6 text-sm text-[var(--muted)]">Keine Treffer.</div>
        ) : null}
      </div>
    </div>
  );
}
