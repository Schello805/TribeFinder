"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function GlobalSearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const lastSubmittedQuery = useRef(initialQuery);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery === lastSubmittedQuery.current) return;

    const timeout = window.setTimeout(() => {
      if (trimmedQuery.length >= 3 || trimmedQuery.length === 0) {
        lastSubmittedQuery.current = trimmedQuery;
        router.replace(trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : "/search");
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [query, router]);

  return (
    <form action="/search" className="mt-4 flex gap-2">
      <input
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        minLength={3}
        autoFocus
        placeholder="z. B. Fusion Workshop Nürnberg"
        className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)]"
      />
      <button className="rounded-md bg-[var(--primary)] px-5 py-3 font-medium text-[var(--primary-foreground)]">
        Suchen
      </button>
    </form>
  );
}
