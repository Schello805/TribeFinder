import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceListingCreateSchema } from "@/lib/validations/marketplace";
import { geocodeGermany } from "@/lib/geocode";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const addMonths = (d: Date, months: number) => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const query = (searchParams.get("query") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const typeRaw = (searchParams.get("type") || "").trim();
  const listingType = typeRaw === "OFFER" || typeRaw === "REQUEST" ? typeRaw : "";

  const sortRaw = (searchParams.get("sort") || "").trim();
  const sort = sortRaw === "priceAsc" || sortRaw === "priceDesc" || sortRaw === "distance" ? sortRaw : "newest";

  const latRaw = (searchParams.get("lat") || "").trim();
  const lngRaw = (searchParams.get("lng") || "").trim();
  const radiusRaw = (searchParams.get("radius") || "").trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const radiusKm = radiusRaw ? Number(radiusRaw) : NaN;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;

  const now = new Date();

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

  const where: {
    expiresAt?: { gt: Date };
    category?: "KOSTUEME" | "SCHMUCK" | "ACCESSOIRES" | "SCHUHE" | "SONSTIGES";
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
    listingType?: "OFFER" | "REQUEST";
  } = {
    expiresAt: { gt: now },
  };

  if (category && ["KOSTUEME", "SCHMUCK", "ACCESSOIRES", "SCHUHE", "SONSTIGES"].includes(category)) {
    where.category = category as typeof where.category;
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  if (listingType) {
    where.listingType = listingType as "OFFER" | "REQUEST";
  }

  if (sort === "distance" && Number.isFinite(lat) && Number.isFinite(lng)) {
    const r = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 50;
    const latDelta = r / 111;
    const lngDelta = r / (111 * Math.cos((lat * Math.PI) / 180) || 1);
    (where as unknown as { lat?: { gte?: number; lte?: number }; lng?: { gte?: number; lte?: number } }).lat = {
      gte: lat - latDelta,
      lte: lat + latDelta,
    };
    (where as unknown as { lat?: { gte?: number; lte?: number }; lng?: { gte?: number; lte?: number } }).lng = {
      gte: lng - lngDelta,
      lte: lng + lngDelta,
    };
  }

  const orderBy =
    sort === "priceAsc"
      ? [{ priceCents: "asc" as const }, { createdAt: "desc" as const }]
      : sort === "priceDesc"
        ? [{ priceCents: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const [total, baseListings] = await Promise.all([
    (prisma as unknown as { marketplaceListing: { count: (args: unknown) => Promise<number> } }).marketplaceListing.count({ where }),
    (prisma as unknown as { marketplaceListing: { findMany: (args: unknown) => Promise<unknown> } }).marketplaceListing.findMany({
      where,
      orderBy,
      skip: sort === "distance" ? 0 : skip,
      take: sort === "distance" ? Math.min(500, MAX_PAGE_SIZE * 5) : limit,
      include: {
        owner: { select: { id: true, name: true, image: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { id: true, url: true, caption: true, order: true } },
      },
    }),
  ]);

  const typedBase = baseListings as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    listingType: "OFFER" | "REQUEST";
    postalCode: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    locationSource: "PROFILE" | "GEOCODE" | null;
    priceCents: number | null;
    priceType: "FIXED" | "NEGOTIABLE";
    currency: string;
    shippingAvailable: boolean;
    shippingCostCents: number | null;
    createdAt: Date;
    expiresAt: Date;
    owner: { id: string; name: string | null; image: string | null };
    images: Array<{ id: string; url: string; caption: string | null; order: number }>;
  }>;

  const listings = (() => {
    if (sort !== "distance" || !Number.isFinite(lat) || !Number.isFinite(lng)) return typedBase;
    const withDist = typedBase
      .map((l) => ({
        l,
        d: typeof l.lat === "number" && typeof l.lng === "number" ? haversineKm(lat, lng, l.lat, l.lng) : Number.POSITIVE_INFINITY,
      }))
      .filter((x: { d: number }) => Number.isFinite(x.d));
    withDist.sort((a: { d: number }, b: { d: number }) => a.d - b.d);
    const sliced = withDist.slice(skip, skip + limit);
    return sliced.map((x: { l: (typeof typedBase)[number] }) => x.l);
  })();

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    listings,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = marketplaceListingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = addMonths(now, 6);

  const userLoc = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notifyLat: true, notifyLng: true },
  });

  let lat: number | null = null;
  let lng: number | null = null;
  let locationSource: "PROFILE" | "GEOCODE" | null = null;

  if (typeof userLoc?.notifyLat === "number" && typeof userLoc?.notifyLng === "number") {
    lat = userLoc.notifyLat;
    lng = userLoc.notifyLng;
    locationSource = "PROFILE";
  } else {
    try {
      const r = await geocodeGermany(`${parsed.data.postalCode} ${parsed.data.city}`);
      if (r) {
        lat = r.lat;
        lng = r.lng;
        locationSource = "GEOCODE";
      }
    } catch {
      // ignore geocoding errors (best-effort)
    }
  }

  const created = await (prisma as unknown as { marketplaceListing: { create: (args: unknown) => Promise<unknown> } }).marketplaceListing.create({
    data: {
      ownerId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      listingType: parsed.data.listingType,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      lat,
      lng,
      locationSource,
      priceCents: typeof parsed.data.priceCents === "number" ? parsed.data.priceCents : null,
      priceType: parsed.data.priceType,
      currency: "EUR",
      shippingAvailable: !!parsed.data.shippingAvailable,
      shippingCostCents: parsed.data.shippingAvailable ? (typeof parsed.data.shippingCostCents === "number" ? parsed.data.shippingCostCents : null) : null,
      expiresAt,
      images: parsed.data.images?.length
        ? {
            create: parsed.data.images.map((img, idx) => ({
              url: img.url,
              caption: img.caption ?? null,
              order: idx,
            })),
          }
        : undefined,
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { order: "asc" }, select: { id: true, url: true, caption: true, order: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
