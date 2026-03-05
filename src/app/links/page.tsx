import Link from "next/link";
import prisma from "@/lib/prisma";
import SubmitLinkForm from "@/app/links/SubmitLinkForm";

export const dynamic = "force-dynamic";

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

export default async function LinksPage() {
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

  const active = items.filter((x: ExternalLinkPublicRow) => !isOfflineArchived({ archivedAt: x.archivedAt, status: x.status }));
  const archived = items.filter((x: ExternalLinkPublicRow) => isOfflineArchived({ archivedAt: x.archivedAt, status: x.status }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Links</h1>
        <div className="text-sm text-[var(--muted)]">
          Externe Websites rund um Tanzgruppen, Vereine, Kostüme und mehr.
        </div>
      </div>

      <SubmitLinkForm />

      <div className="space-y-3">
        <div className="tf-display text-xl font-semibold text-[var(--foreground)]">Aktiv</div>
        {active.length === 0 ? (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-[var(--muted)]">Noch keine Links.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map((x: ExternalLinkPublicRow) => (
              <a
                key={x.id}
                href={x.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:bg-[var(--surface-hover)] transition"
              >
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
