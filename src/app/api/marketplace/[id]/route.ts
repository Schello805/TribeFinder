import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceListingUpdateSchema } from "@/lib/validations/marketplace";
import { deleteUploadByPublicUrl } from "@/lib/uploadFiles";
import { geocodeGermany } from "@/lib/geocode";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const listing = (await (prisma as unknown as { marketplaceListing: { findUnique: (args: unknown) => Promise<unknown> } }).marketplaceListing.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { order: "asc" }, select: { id: true, url: true, caption: true, order: true } },
    },
  })) as {
    id: string;
    ownerId: string;
    expiresAt: Date;
    owner: { id: string; name: string | null; image: string | null };
    images: Array<{ id: string; url: string; caption: string | null; order: number }>;
  } | null;

  if (!listing) return NextResponse.json({ message: "Inserat nicht gefunden" }, { status: 404 });
  if (listing.expiresAt <= new Date()) return NextResponse.json({ message: "Inserat ist abgelaufen" }, { status: 404 });

  return NextResponse.json(listing);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const id = (await params).id;

  const existing = (await (prisma as unknown as { marketplaceListing: { findUnique: (args: unknown) => Promise<unknown> } }).marketplaceListing.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  })) as { id: string; ownerId: string } | null;
  if (!existing) return NextResponse.json({ message: "Inserat nicht gefunden" }, { status: 404 });
  if (existing.ownerId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = marketplaceListingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  let lat: number | null | undefined = undefined;
  let lng: number | null | undefined = undefined;
  let locationSource: "PROFILE" | "GEOCODE" | null | undefined = undefined;

  if (typeof parsed.data.postalCode === "string" || typeof parsed.data.city === "string") {
    const current = (await (prisma as unknown as { marketplaceListing: { findUnique: (args: unknown) => Promise<unknown> } }).marketplaceListing.findUnique({
      where: { id },
      select: { postalCode: true, city: true },
    })) as { postalCode: string | null; city: string | null } | null;

    const userLoc = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notifyLat: true, notifyLng: true },
    });

    if (typeof userLoc?.notifyLat === "number" && typeof userLoc?.notifyLng === "number") {
      lat = userLoc.notifyLat;
      lng = userLoc.notifyLng;
      locationSource = "PROFILE";
    } else {
      const effectivePostal = typeof parsed.data.postalCode === "string" ? parsed.data.postalCode : current?.postalCode || "";
      const effectiveCity = typeof parsed.data.city === "string" ? parsed.data.city : current?.city || "";
      const r = await geocodeGermany(`${effectivePostal} ${effectiveCity}`);
      if (r) {
        lat = r.lat;
        lng = r.lng;
        locationSource = "GEOCODE";
      } else {
        lat = null;
        lng = null;
        locationSource = null;
      }
    }
  }

  const updated = await (prisma as unknown as { marketplaceListing: { update: (args: unknown) => Promise<unknown> } }).marketplaceListing.update({
    where: { id },
    data: {
      title: typeof parsed.data.title === "string" ? parsed.data.title : undefined,
      description: typeof parsed.data.description === "string" ? parsed.data.description : undefined,
      category: parsed.data.category,
      listingType: parsed.data.listingType,
      postalCode: typeof parsed.data.postalCode === "string" ? parsed.data.postalCode : undefined,
      city: typeof parsed.data.city === "string" ? parsed.data.city : undefined,
      lat,
      lng,
      locationSource,
      priceCents: typeof parsed.data.priceCents === "number" ? parsed.data.priceCents : parsed.data.priceCents === null ? null : undefined,
      priceType: parsed.data.priceType,
      currency: "EUR",
      shippingAvailable: typeof parsed.data.shippingAvailable === "boolean" ? parsed.data.shippingAvailable : undefined,
      shippingCostCents:
        typeof parsed.data.shippingAvailable === "boolean"
          ? parsed.data.shippingAvailable
            ? typeof parsed.data.shippingCostCents === "number"
              ? parsed.data.shippingCostCents
              : null
            : null
          : typeof parsed.data.shippingCostCents === "number"
            ? parsed.data.shippingCostCents
            : parsed.data.shippingCostCents === null
              ? null
              : undefined,
      images: parsed.data.images
        ? {
            deleteMany: {},
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

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const id = (await params).id;

  const existing = (await (prisma as unknown as { marketplaceListing: { findUnique: (args: unknown) => Promise<unknown> } }).marketplaceListing.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  })) as { id: string; ownerId: string } | null;
  if (!existing) return NextResponse.json({ message: "Inserat nicht gefunden" }, { status: 404 });
  if (existing.ownerId !== session.user.id && session.user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const withImages = (await (prisma as unknown as { marketplaceListing: { findUnique: (args: unknown) => Promise<unknown> } }).marketplaceListing.findUnique({
    where: { id },
    select: { images: { select: { url: true } } },
  })) as { images: Array<{ url: string }> } | null;

  await (prisma as unknown as { marketplaceListing: { delete: (args: unknown) => Promise<unknown> } }).marketplaceListing.delete({ where: { id } });

  const urls = (withImages?.images || []).map((i) => i.url);
  await Promise.all(urls.map((u: string) => deleteUploadByPublicUrl(u)));

  return NextResponse.json({ ok: true });
}
