import Link from "next/link";
import MarketplaceFilterBar from "@/app/marketplace/MarketplaceFilterBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

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

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const sp = (await searchParams) ?? {};

  const queryRaw = typeof sp.query === "string" ? sp.query.trim() : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";

  const sortRaw = typeof sp.sort === "string" ? sp.sort.trim() : "";
  const sort = sortRaw === "priceAsc" || sortRaw === "priceDesc" || sortRaw === "distance" ? sortRaw : "newest";

  const typeRaw = typeof sp.type === "string" ? sp.type.trim() : "";
  const listingType = typeRaw === "OFFER" || typeRaw === "REQUEST" ? (typeRaw as "OFFER" | "REQUEST") : "";

  const address = typeof sp.address === "string" ? sp.address.trim() : "";
  const latRaw = typeof sp.lat === "string" ? sp.lat.trim() : "";
  const lngRaw = typeof sp.lng === "string" ? sp.lng.trim() : "";
  const radiusRaw = typeof sp.radius === "string" ? sp.radius.trim() : "";
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;

  const category = ["KOSTUEME", "SCHMUCK", "ACCESSOIRES", "SCHUHE", "SONSTIGES"].includes(categoryRaw)
    ? (categoryRaw as "KOSTUEME" | "SCHMUCK" | "ACCESSOIRES" | "SCHUHE" | "SONSTIGES")
    : "";

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXTAUTH_URL || "";

  const apiParams = new URLSearchParams();
  if (queryRaw) apiParams.set("query", queryRaw);
  if (category) apiParams.set("category", category);
  if (sort && sort !== "newest") apiParams.set("sort", sort);
  if (listingType) apiParams.set("type", listingType);
  if (latRaw && lngRaw) {
    apiParams.set("lat", latRaw);
    apiParams.set("lng", lngRaw);
    if (radiusRaw) apiParams.set("radius", radiusRaw);
  }
  apiParams.set("limit", "60");

  const listings = (await (async () => {
    try {
      if (!baseUrl) return [];
      const res = await fetch(`${baseUrl}/api/marketplace?${apiParams.toString()}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        listings?: unknown;
      };
      if (!res.ok || !Array.isArray(data.listings)) return [];
      return data.listings;
    } catch {
      return [];
    }
  })()) as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    listingType: "OFFER" | "REQUEST";
    postalCode: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    priceCents: number | null;
    priceType: "FIXED" | "NEGOTIABLE";
    shippingAvailable: boolean;
    shippingCostCents: number | null;
    createdAt: Date;
    images: Array<{ id: string; url: string }>;
  }>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="tf-display text-3xl font-bold text-[var(--foreground)] truncate">Second-Hand</h1>
          <div className="text-sm text-[var(--muted)]">Second-Hand für Kostüme, Schmuck, Accessoires und mehr.</div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            Hinweis: Das ist eine Plattform für Privatverkäufe. Bitte keine Neuware / gewerblichen Verkauf einstellen.
          </div>
        </div>
        {session?.user ? (
          <Link
            href="/marketplace/new"
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
          >
            Inserat erstellen
          </Link>
        ) : null}
      </div>

      <MarketplaceFilterBar query={queryRaw} category={category} sort={sort} type={listingType} address={address} lat={latRaw} lng={lngRaw} radius={radiusRaw || "50"} />

      {listings.length === 0 ? (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--muted)]">
          Keine Inserate gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => {
            const cover = l.images[0]?.url || "";
            const locationText = [l.postalCode, l.city].filter(Boolean).join(" ") || "Standort unbekannt";
            const distKm =
              Number.isFinite(lat) && Number.isFinite(lng) && typeof l.lat === "number" && typeof l.lng === "number"
                ? haversineKm(lat, lng, l.lat, l.lng)
                : null;
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[var(--foreground)] line-clamp-2">{l.title}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] whitespace-nowrap">
                      {l.listingType === "REQUEST" ? "Ich suche" : "Ich biete"}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--muted)] line-clamp-2">{l.description}</div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-[var(--foreground)] font-medium">
                      {formatPrice(l.priceCents)}
                      {l.priceType === "NEGOTIABLE" ? " (VB)" : ""}
                    </span>
                    <span className="text-xs text-[var(--muted)]">{l.category}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                    <span>{locationText}</span>
                    <span>
                      {distKm !== null && Number.isFinite(distKm) ? `${Math.round(distKm)} km • ` : ""}
                      {new Date(l.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted)]">{formatShipping(l.shippingAvailable, l.shippingCostCents)}</div>
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
