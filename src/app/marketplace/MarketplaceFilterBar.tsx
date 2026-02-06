"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const categories = [
  { value: "", label: "Alle" },
  { value: "KOSTUEME", label: "Kostüme" },
  { value: "SCHMUCK", label: "Schmuck" },
  { value: "ACCESSOIRES", label: "Accessoires" },
  { value: "SCHUHE", label: "Schuhe" },
  { value: "SONSTIGES", label: "Sonstiges" },
] as const;

const sorts = [
  { value: "newest", label: "Neueste" },
  { value: "priceAsc", label: "Preis: aufsteigend" },
  { value: "priceDesc", label: "Preis: absteigend" },
] as const;

export default function MarketplaceFilterBar(props: { query: string; category: string; sort: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [query, setQuery] = useState(() => props.query);
  const [category, setCategory] = useState(() => props.category);
  const [sort, setSort] = useState(() => props.sort);

  const currentBase = useMemo(() => {
    const u = new URLSearchParams(sp);
    u.delete("query");
    u.delete("category");
    u.delete("sort");
    u.delete("page");
    return u;
  }, [sp]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const u = new URLSearchParams(currentBase);
      if (query.trim()) u.set("query", query.trim());
      if (category) u.set("category", category);
      if (sort && sort !== "newest") u.set("sort", sort);

      const next = u.toString();
      const href = next ? `/marketplace?${next}` : "/marketplace";
      const current = sp.toString();
      const currentHref = current ? `/marketplace?${current}` : "/marketplace";
      if (href !== currentHref) router.push(href);
    }, 400);

    return () => window.clearTimeout(t);
  }, [query, category, sort, currentBase, router, sp]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche…"
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex justify-end">
          <Link
            href="/marketplace"
            className="w-full sm:w-auto px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition text-center"
          >
            Reset
          </Link>
        </div>
      </div>
    </div>
  );
}
