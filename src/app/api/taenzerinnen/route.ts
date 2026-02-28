import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await getServerSession(authOptions).catch(() => null);
  const showPrivate = Boolean(session?.user?.id);

  const query = (searchParams.get("query") || "").trim();
  const hasBio = searchParams.get("hasBio") === "1";
  const hasGroups = searchParams.get("hasGroups") === "1";
  const teaches = searchParams.get("teaches") === "1";
  const workshops = searchParams.get("workshops") === "1";
  const danceStyleId = (searchParams.get("danceStyleId") || "").trim();
  const style = (searchParams.get("style") || "").trim();
  const sortRaw = (searchParams.get("sort") || "").trim();
  const sort = sortRaw === "name" ? "name" : "newest";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;

  const whereClause: {
    isDancerProfileEnabled: boolean;
    isDancerProfilePrivate?: boolean;
    dancerTeaches?: boolean;
    dancerGivesWorkshops?: boolean;
    OR?: Array<{ dancerName?: { contains: string }; name?: { contains: string }; bio?: { contains: string } }>;
    bio?: { not: null };
    memberships?: { some: { status: "APPROVED" } };
    danceStyles?: { some: { style: { name: string } } };
  } = {
    isDancerProfileEnabled: true,
    ...(showPrivate ? {} : { isDancerProfilePrivate: false }),
  };

  if (query) {
    whereClause.OR = [
      { dancerName: { contains: query } },
      { name: { contains: query } },
      { bio: { contains: query } },
    ];
  }

  if (hasBio) {
    whereClause.bio = { not: null };
  }

  if (hasGroups) {
    whereClause.memberships = { some: { status: "APPROVED" } };
  }

  if (teaches) {
    whereClause.dancerTeaches = true;
  }

  if (workshops) {
    whereClause.dancerGivesWorkshops = true;
  }

  if (danceStyleId) {
    whereClause.danceStyles = { some: { styleId: danceStyleId } } as unknown as typeof whereClause.danceStyles;
  } else if (style) {
    whereClause.danceStyles = { some: { style: { name: style } } };
  }

  try {
    // Cast for resilience in case a stale Prisma client is used locally.
    // (Runtime still requires `prisma generate` to have the new fields.)
    type FindManyArgs = NonNullable<Parameters<typeof prisma.user.findMany>[0]>;
    const whereAny = whereClause as unknown as FindManyArgs["where"];

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereAny }),
      prisma.user.findMany(
        {
          where: whereAny,
          select: {
            id: true,
            name: true,
            dancerName: true,
            image: true,
            bio: true,
            dancerTeaches: true,
            dancerTeachingWhere: true,
            dancerTeachingFocus: true,
            dancerEducation: true,
            dancerPerformances: true,
            dancerGivesWorkshops: true,
            dancerBookableForShows: true,
            dancerWorkshopConditions: true,
            updatedAt: true,
            memberships: {
              where: { status: "APPROVED" },
              select: {
                role: true,
                group: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
          orderBy: sort === "name" ? [{ dancerName: "asc" }, { name: "asc" }] : [{ updatedAt: "desc" }],
          skip,
          take: limit,
        } as unknown as FindManyArgs
      ),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unknown argument `isDancerProfileEnabled`") || msg.includes("Unknown field `isDancerProfileEnabled`")) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: "Fehler beim Laden" }, { status: 500 });
  }
}
