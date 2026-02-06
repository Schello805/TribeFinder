import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceListingCreateSchema } from "@/lib/validations/marketplace";

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

  const sortRaw = (searchParams.get("sort") || "").trim();
  const sort = sortRaw === "priceAsc" || sortRaw === "priceDesc" ? sortRaw : "newest";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;

  const now = new Date();

  const where: {
    expiresAt?: { gt: Date };
    category?: "KOSTUEME" | "SCHMUCK" | "ACCESSOIRES" | "SCHUHE" | "SONSTIGES";
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
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

  const orderBy =
    sort === "priceAsc"
      ? [{ priceCents: "asc" as const }, { createdAt: "desc" as const }]
      : sort === "priceDesc"
        ? [{ priceCents: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const [total, listings] = await Promise.all([
    prisma.marketplaceListing.count({ where }),
    prisma.marketplaceListing.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        owner: { select: { id: true, name: true, image: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { id: true, url: true, caption: true, order: true } },
      },
    }),
  ]);

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

  const created = await prisma.marketplaceListing.create({
    data: {
      ownerId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priceCents: typeof parsed.data.priceCents === "number" ? parsed.data.priceCents : null,
      currency: "EUR",
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
