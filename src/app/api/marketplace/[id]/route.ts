import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceListingUpdateSchema } from "@/lib/validations/marketplace";
import { deleteUploadByPublicUrl } from "@/lib/uploadFiles";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { order: "asc" }, select: { id: true, url: true, caption: true, order: true } },
    },
  });

  if (!listing) return NextResponse.json({ message: "Inserat nicht gefunden" }, { status: 404 });
  if (listing.expiresAt <= new Date()) return NextResponse.json({ message: "Inserat ist abgelaufen" }, { status: 404 });

  return NextResponse.json(listing);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const id = (await params).id;

  const existing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!existing) return NextResponse.json({ message: "Inserat nicht gefunden" }, { status: 404 });
  if (existing.ownerId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = marketplaceListingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.marketplaceListing.update({
    where: { id },
    data: {
      title: typeof parsed.data.title === "string" ? parsed.data.title : undefined,
      description: typeof parsed.data.description === "string" ? parsed.data.description : undefined,
      category: parsed.data.category,
      priceCents: typeof parsed.data.priceCents === "number" ? parsed.data.priceCents : parsed.data.priceCents === null ? null : undefined,
      currency: typeof parsed.data.currency === "string" ? (parsed.data.currency.trim() || "EUR") : undefined,
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

  const existing = await prisma.marketplaceListing.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!existing) return NextResponse.json({ message: "Inserat nicht gefunden" }, { status: 404 });
  if (existing.ownerId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const withImages = await prisma.marketplaceListing.findUnique({
    where: { id },
    select: { images: { select: { url: true } } },
  });

  await prisma.marketplaceListing.delete({ where: { id } });

  const urls = withImages?.images?.map((i) => i.url) ?? [];
  await Promise.all(urls.map((u) => deleteUploadByPublicUrl(u)));

  return NextResponse.json({ ok: true });
}
