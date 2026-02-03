"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

export default function EventFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch] = useDebounce(search, 500);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }

    const next = params.toString();
    if (next === searchParamsString) return;

    router.replace(next ? `/events?${next}` : "/events");
  }, [debouncedSearch, router, searchParamsString]);

  return (
    <div className="bg-[var(--surface)] text-[var(--foreground)] p-4 rounded-lg shadow-sm border border-[var(--border)] mb-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Events suchen (Titel, Ort, Gruppe)..."
          className="block w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:placeholder:text-[var(--muted)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
