"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";

export default function DancerFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [hasBio, setHasBio] = useState(searchParams.get("hasBio") === "1");
  const [hasGroups, setHasGroups] = useState(searchParams.get("hasGroups") === "1");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const updateUrl = useCallback(
    (newQuery: string, newSort: string, newHasBio: boolean, newHasGroups: boolean) => {
      const params = new URLSearchParams(searchParamsString);

      if (newQuery) params.set("query", newQuery);
      else params.delete("query");

      if (newSort && newSort !== "newest") params.set("sort", newSort);
      else params.delete("sort");

      if (newHasBio) params.set("hasBio", "1");
      else params.delete("hasBio");

      if (newHasGroups) params.set("hasGroups", "1");
      else params.delete("hasGroups");

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `/taenzerinnen?${nextQuery}` : "/taenzerinnen";
      const currentUrl = searchParamsString ? `/taenzerinnen?${searchParamsString}` : "/taenzerinnen";
      if (nextUrl === currentUrl) return;

      router.replace(nextUrl);
    },
    [router, searchParamsString]
  );

  useEffect(() => {
    updateUrl(debouncedSearchTerm, sort, hasBio, hasGroups);
  }, [debouncedSearchTerm, sort, hasBio, hasGroups, updateUrl]);

  const clearAll = () => {
    setSearchTerm("");
    setSort("newest");
    setHasBio(false);
    setHasGroups(false);
    updateUrl("", "newest", false, false);
  };

  const hasActiveFilters = Boolean(searchTerm.trim()) || Boolean(sort && sort !== "newest") || hasBio || hasGroups;

  return (
    <div className="mb-4 bg-[var(--surface)] text-[var(--foreground)] p-3 rounded-lg shadow-sm border border-[var(--border)] space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Suche</label>
          <input
            type="text"
            placeholder="Name, Bio…"
            className="w-full px-3 py-2 min-h-10 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Sortierung</label>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full px-3 py-2 pr-9 min-h-10 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] appearance-none"
            >
              <option value="newest">Neueste</option>
              <option value="name">Alphabetisch</option>
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

      <details
        className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]"
        open={isFilterOpen}
        onToggle={(e) => setIsFilterOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-[var(--foreground)]">
          Filter
        </summary>
        <div className="px-3 pb-3 pt-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Optionen</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={hasBio}
                    onChange={(e) => setHasBio(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Mit Bio
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={hasGroups}
                    onChange={(e) => setHasGroups(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Mit Gruppen
                </label>
              </div>
            </div>
          </div>
        </div>
      </details>

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {hasBio ? (
            <button
              type="button"
              onClick={() => setHasBio(false)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Mit Bio
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {hasGroups ? (
            <button
              type="button"
              onClick={() => setHasGroups(false)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Mit Gruppen
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {searchTerm.trim() ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Suche
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {sort && sort !== "newest" ? (
            <button
              type="button"
              onClick={() => setSort("newest")}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Sortierung
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={clearAll}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : null}
    </div>
  );
}
