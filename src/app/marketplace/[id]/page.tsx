import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DeleteMarketplaceListingButton from "@/components/marketplace/DeleteMarketplaceListingButton";

export const dynamic = "force-dynamic";

const categoryLabel = (c: string) => {
  if (c === "KOSTUEME") return "Kostüme";
  if (c === "SCHMUCK") return "Schmuck";
  if (c === "ACCESSOIRES") return "Accessoires";
  if (c === "SCHUHE") return "Schuhe";
  if (c === "SONSTIGES") return "Sonstiges";
  return c;
};

const formatPrice = (priceCents: number | null) => {
  if (priceCents === null) return "Preis auf Anfrage";
  const amount = priceCents / 100;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
};

const formatShipping = (shippingAvailable: boolean, shippingCostCents: number | null) => {
  if (!shippingAvailable) return "Nur Abholung";
  const cost = typeof shippingCostCents === "number" ? shippingCostCents : 0;
  const amount = cost / 100;
  return `Versand möglich (${new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount)})`;
};

export default async function MarketplaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const session = await getServerSession(authOptions);

  const listing = (await (prisma as unknown as { marketplaceListing: { findUnique: (args: unknown) => Promise<unknown> } }).marketplaceListing.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { order: "asc" }, select: { id: true, url: true, caption: true } },
    },
  })) as {
    id: string;
    ownerId: string;
    title: string;
    description: string;
    category: string;
    listingType: "OFFER" | "REQUEST";
    postalCode: string | null;
    city: string | null;
    locationSource: "PROFILE" | "GEOCODE" | null;
    priceCents: number | null;
    priceType: "FIXED" | "NEGOTIABLE";
    shippingAvailable: boolean;
    shippingCostCents: number | null;
    createdAt: Date;
    expiresAt: Date;
    owner: { id: string; name: string | null; image: string | null };
    images: Array<{ id: string; url: string; caption: string | null }>;
  } | null;

  if (!listing) notFound();
  if (listing.expiresAt <= new Date()) notFound();

  const isOwner = !!session?.user?.id && session.user.id === listing.ownerId;
  const isAdmin = session?.user?.role === "ADMIN";

  const ownerName = listing.owner.name || "Unbekannt";

  const contactHref = session?.user
    ? `/direct-messages/new?receiverId=${encodeURIComponent(listing.ownerId)}&listingId=${encodeURIComponent(listing.id)}`
    : "/auth/signin";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-[var(--muted)]">{categoryLabel(listing.category)}</div>
          <h1 className="tf-display text-3xl font-bold text-[var(--foreground)] truncate">{listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
              {listing.listingType === "REQUEST" ? "Ich suche" : "Ich biete"}
            </span>
            <span>
              {listing.postalCode || ""} {listing.city || ""}
            </span>
            <span>•</span>
            <span>Eingestellt am {new Date(listing.createdAt).toLocaleDateString("de-DE")}</span>
            <span>•</span>
            <span>
              Standort: {listing.locationSource === "PROFILE" ? "aus Profil" : listing.locationSource === "GEOCODE" ? "aus PLZ/Ort" : "unbekannt"}
            </span>
          </div>
        </div>
        <Link
          href="/marketplace"
          className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition"
        >
          Zurück
        </Link>
      </div>

      {listing.images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {listing.images.map((img) => (
            <a
              key={img.id}
              href={img.url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]"
              title={img.caption || ""}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--muted)]">
          Keine Bilder vorhanden.
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[var(--muted)]">Preis</div>
            <div className="text-xl font-bold text-[var(--foreground)]">
              {formatPrice(listing.priceCents)}
              {listing.priceType === "NEGOTIABLE" ? " (VB)" : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--muted)]">Anbieter</div>
            <div className="font-medium text-[var(--foreground)]">{ownerName}</div>
          </div>
        </div>

        <div className="text-sm text-[var(--muted)]">{formatShipping(listing.shippingAvailable, listing.shippingCostCents)}</div>

        <div className="whitespace-pre-wrap text-[var(--foreground)]">{listing.description}</div>

        <div className="flex flex-wrap gap-3 justify-end">
          {isOwner ? (
            <Link
              href={`/marketplace/${listing.id}/edit`}
              className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition font-medium"
            >
              Bearbeiten
            </Link>
          ) : null}

          {isOwner || isAdmin ? <DeleteMarketplaceListingButton listingId={listing.id} redirectTo="/marketplace" /> : null}

          <Link
            href={contactHref}
            className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
            prefetch={false}
          >
            {session?.user ? "Nachricht senden" : "Zum Login"}
          </Link>
        </div>
      </div>

      <div className="text-xs text-[var(--muted)]">
        Dieses Inserat ist bis {new Date(listing.expiresAt).toLocaleDateString("de-DE")} online.
      </div>
    </div>
  );
}
