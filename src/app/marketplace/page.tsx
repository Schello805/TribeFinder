import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const categories = [
  { value: "", label: "Alle" },
  { value: "KOSTUEME", label: "Kostüme" },
  { value: "SCHMUCK", label: "Schmuck" },
  { value: "ACCESSOIRES", label: "Accessoires" },
  { value: "SCHUHE", label: "Schuhe" },
  { value: "SONSTIGES", label: "Sonstiges" },
] as const;

const formatPrice = (priceCents: number | null, currency: string) => {
  if (priceCents === null) return "Preis auf Anfrage";
  const amount = priceCents / 100;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};

  const queryRaw = typeof sp.query === "string" ? sp.query.trim() : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";

  const minPriceRaw = typeof sp.minPrice === "string" ? sp.minPrice.trim() : "";
  const maxPriceRaw = typeof sp.maxPrice === "string" ? sp.maxPrice.trim() : "";

  const minPrice = minPriceRaw ? Number(minPriceRaw) : NaN;
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : NaN;

  const category = ["KOSTUEME", "SCHMUCK", "ACCESSOIRES", "SCHUHE", "SONSTIGES"].includes(categoryRaw)
    ? (categoryRaw as "KOSTUEME" | "SCHMUCK" | "ACCESSOIRES" | "SCHUHE" | "SONSTIGES")
    : "";

  const where: {
    expiresAt: { gt: Date };
    category?: "KOSTUEME" | "SCHMUCK" | "ACCESSOIRES" | "SCHUHE" | "SONSTIGES";
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
    priceCents?: { gte?: number; lte?: number };
  } = {
    expiresAt: { gt: new Date() },
  };

  if (category) where.category = category;

  if (queryRaw) {
    where.OR = [
      { title: { contains: queryRaw, mode: "insensitive" } },
      { description: { contains: queryRaw, mode: "insensitive" } },
    ];
  }

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.priceCents = {};
    if (Number.isFinite(minPrice)) where.priceCents.gte = Math.max(0, Math.floor(minPrice));
    if (Number.isFinite(maxPrice)) where.priceCents.lte = Math.max(0, Math.floor(maxPrice));
  }

  const listings = (await (prisma as unknown as { marketplaceListing: { findMany: (args: unknown) => Promise<unknown> } }).marketplaceListing.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 60,
    include: {
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { order: "asc" }, take: 1, select: { id: true, url: true } },
    },
  })) as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priceCents: number | null;
    currency: string;
    images: Array<{ id: string; url: string }>;
  }>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="tf-display text-3xl font-bold text-[var(--foreground)] truncate">Marketplace</h1>
          <div className="text-sm text-[var(--muted)]">Second-Hand Börse für Kostüme, Schmuck, Accessoires und mehr.</div>
        </div>
        <Link
          href="/marketplace/new"
          className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
        >
          Inserat erstellen
        </Link>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <form className="grid grid-cols-1 sm:grid-cols-4 gap-3" action="/marketplace" method="GET">
          <input
            name="query"
            defaultValue={queryRaw}
            placeholder="Suche…"
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />

          <select
            name="category"
            defaultValue={category}
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <input
            name="minPrice"
            defaultValue={minPriceRaw}
            placeholder="Min Preis (Cent)"
            inputMode="numeric"
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />

          <input
            name="maxPrice"
            defaultValue={maxPriceRaw}
            placeholder="Max Preis (Cent)"
            inputMode="numeric"
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />

          <div className="sm:col-span-4 flex gap-3 justify-end">
            <Link
              href="/marketplace"
              className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition"
            >
              Reset
            </Link>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
            >
              Filtern
            </button>
          </div>
        </form>

        <div className="mt-3 text-xs text-[var(--muted)]">
          Tipp: Preisfilter ist aktuell in Cent (z.B. 2500 = 25,00€). Das machen wir später noch hübscher.
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--muted)]">
          Keine Inserate gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => {
            const cover = l.images[0]?.url || "";
            return (
              <Link
                key={l.id}
                href={`/marketplace/${l.id}`}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:bg-[var(--surface-hover)] transition"
              >
                <div className="aspect-[4/3] bg-[var(--surface-2)]">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">Kein Bild</div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-semibold text-[var(--foreground)] line-clamp-2">{l.title}</div>
                  <div className="text-sm text-[var(--muted)] line-clamp-2">{l.description}</div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-[var(--foreground)] font-medium">{formatPrice(l.priceCents, l.currency)}</span>
                    <span className="text-xs text-[var(--muted)]">{l.category}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-xs text-[var(--muted)]">&nbsp;</div>
    </div>
  );
}
