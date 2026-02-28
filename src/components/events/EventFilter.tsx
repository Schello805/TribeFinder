"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

export default function EventFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [danceStyleId, setDanceStyleId] = useState(searchParams.get("danceStyleId") || "");
  const [availableStyles, setAvailableStyles] = useState<Array<{ id: string; name: string }>>([]);
  const [debouncedSearch] = useDebounce(search, 500);

  useEffect(() => {
    const loadStyles = async () => {
      try {
        const res = await fetch("/api/dance-styles", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as unknown;
        const available =
          typeof data === "object" && data !== null && "available" in data && Array.isArray((data as { available?: unknown }).available)
            ? ((data as { available: unknown[] }).available as unknown[])
            : [];
        const mapped = available
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const id = "id" in x && typeof (x as { id?: unknown }).id === "string" ? (x as { id: string }).id : null;
            const name = "name" in x && typeof (x as { name?: unknown }).name === "string" ? (x as { name: string }).name : null;
            if (!id || !name) return null;
            return { id, name };
          })
          .filter(Boolean) as Array<{ id: string; name: string }>;
        setAvailableStyles(mapped);
      } catch {
        return;
      }
    };
    void loadStyles();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }

    if (danceStyleId) params.set("danceStyleId", danceStyleId);
    else params.delete("danceStyleId");

    const next = params.toString();
    if (next === searchParamsString) return;

    router.replace(next ? `/events?${next}` : "/events");
  }, [debouncedSearch, danceStyleId, router, searchParamsString]);

  return (
    <div className="bg-[var(--surface)] text-[var(--foreground)] p-4 rounded-lg shadow-sm border border-[var(--border)] mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Events suchen (Titel, Ort, Gruppe)..."
            className="block w-full pl-10 pr-3 py-2 min-h-11 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:placeholder:text-[var(--muted)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <select
            value={danceStyleId}
            onChange={(e) => setDanceStyleId(e.target.value)}
            className="block w-full px-3 py-2 pr-9 min-h-11 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm appearance-none"
          >
            <option value="">Alle Tanzstile</option>
            {availableStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
