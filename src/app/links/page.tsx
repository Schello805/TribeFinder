import Link from "next/link";
import prisma from "@/lib/prisma";
import SubmitLinkForm from "@/app/links/SubmitLinkForm";
import SuggestLinkEditForm from "@/app/links/SuggestLinkEditForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    category?: string;
  };
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const isFiltered = Boolean(searchParams?.category);
  return {
    title: "Links | TribeFinder",
    description: "Externe Websites rund um Tanzgruppen, Vereine, Kostüme und mehr.",
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
    alternates: {
      canonical: "/links",
    },
  };
}

function isOfflineArchived(x: { archivedAt: Date | null; status: string }) {
  return x.status === "OFFLINE" || x.archivedAt;
}

type ExternalLinkPublicRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  lastCheckedAt: Date | null;
  lastStatusCode: number | null;
  archivedAt: Date | null;
};

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findMany: (args: unknown) => Promise<ExternalLinkPublicRow[]>;
      };
}

export default async function LinksPage({ searchParams }: PageProps) {
  const delegate = getExternalLinkDelegate(prisma);
  if (!delegate) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Links</h1>
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-[var(--muted)]">
          Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.
        </div>
      </div>
    );
  }

  const items = await delegate.findMany({
    where: { status: { in: ["APPROVED", "OFFLINE"] } },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      url: true,
      title: true,
      category: true,
      postalCode: true,
      city: true,
      status: true,
      lastCheckedAt: true,
      lastStatusCode: true,
      archivedAt: true,
    },
    take: 500,
  });

  const activeAll = items.filter((x: ExternalLinkPublicRow) => !isOfflineArchived({ archivedAt: x.archivedAt, status: x.status }));
  const archivedAll = items.filter((x: ExternalLinkPublicRow) => isOfflineArchived({ archivedAt: x.archivedAt, status: x.status }));

  const rawCategory = typeof searchParams?.category === "string" ? searchParams.category.trim() : "";
  const normalizedCategory = rawCategory === "__uncategorized" ? "" : rawCategory;
  const filterActive = rawCategory.length > 0;

  const matchesCategory = (x: ExternalLinkPublicRow) => {
    if (!filterActive) return true;
    if (rawCategory === "__uncategorized") return !x.category;
    return (x.category || "").trim() === normalizedCategory;
  };

  const active = activeAll.filter(matchesCategory);
  const archived = archivedAll.filter(matchesCategory);

  const categories = Array.from(
    new Set(
      items
        .map((x) => (x.category || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    )
  );
  const hasUncategorized = items.some((x) => !(x.category || "").trim());

  const chipBase =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs transition";
  const chipActive = "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]";
  const chipInactive = "border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Links</h1>
        <div className="text-sm text-[var(--muted)]">
          Externe Websites rund um Tanzgruppen, Vereine, Kostüme und mehr.
        </div>

        {filterActive ? (
          <div className="pt-1 flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]">
              Kategorie: {rawCategory === "__uncategorized" ? "Ohne Kategorie" : normalizedCategory}
            </span>
            <Link href="/links" className="underline underline-offset-2 hover:opacity-90 text-[var(--muted)]">
              Filter zurücksetzen
            </Link>
          </div>
        ) : null}

        {categories.length > 0 || hasUncategorized ? (
          <div className="pt-3">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/links"
                className={`${chipBase} ${!filterActive ? chipActive : chipInactive}`}
                aria-current={!filterActive ? "page" : undefined}
              >
                Alle
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={{ pathname: "/links", query: { category: c } }}
                  className={`${chipBase} ${rawCategory === c ? chipActive : chipInactive}`}
                  aria-current={rawCategory === c ? "page" : undefined}
                >
                  {c}
                </Link>
              ))}
              {hasUncategorized ? (
                <Link
                  href={{ pathname: "/links", query: { category: "__uncategorized" } }}
                  className={`${chipBase} ${rawCategory === "__uncategorized" ? chipActive : chipInactive}`}
                  aria-current={rawCategory === "__uncategorized" ? "page" : undefined}
                >
                  Ohne Kategorie
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <SubmitLinkForm />

      <div className="space-y-3">
        <div className="tf-display text-xl font-semibold text-[var(--foreground)]">Aktiv</div>
        {active.length === 0 ? (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-[var(--muted)]">Noch keine Links.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map((x: ExternalLinkPublicRow) => (
              <div key={x.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:bg-[var(--surface-hover)] transition">
                <a href={x.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="font-semibold text-[var(--foreground)] line-clamp-2">{x.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
                    {x.category ? (
                      <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">{x.category}</span>
                    ) : null}
                    {x.postalCode || x.city ? (
                      <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                        {[x.postalCode, x.city].filter(Boolean).join(" ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)] break-all">{x.url}</div>
                  <div className="mt-2 text-[10px] text-[var(--muted)]">
                    {x.lastCheckedAt ? (
                      <span>
                        zuletzt geprüft: {new Date(x.lastCheckedAt).toLocaleDateString("de-DE")}
                        {typeof x.lastStatusCode === "number" ? ` (HTTP ${x.lastStatusCode})` : ""}
                      </span>
                    ) : (
                      <span>noch nicht geprüft</span>
                    )}
                  </div>
                </a>

                <SuggestLinkEditForm
                  link={{
                    id: x.id,
                    url: x.url,
                    title: x.title,
                    category: x.category,
                    postalCode: x.postalCode,
                    city: x.city,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="tf-display text-xl font-semibold text-[var(--foreground)]">Archiv</div>
        {archived.length === 0 ? (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-[var(--muted)]">Leer.</div>
        ) : (
          <div className="space-y-2">
            {archived.map((x: ExternalLinkPublicRow) => (
              <div key={x.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div className="font-semibold text-[var(--foreground)] line-clamp-2">{x.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
                  {x.category ? (
                    <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">{x.category}</span>
                  ) : null}
                  {x.postalCode || x.city ? (
                    <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                      {[x.postalCode, x.city].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)] break-all">{x.url}</div>
                <div className="mt-2 text-[10px] text-[var(--muted)]">
                  offline (HTTP {x.lastStatusCode ?? "?"})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-[var(--muted)]">
        <Link href="/hilfe" className="underline underline-offset-2 hover:opacity-90">
          Hilfe
        </Link>
      </div>
    </div>
  );
}
