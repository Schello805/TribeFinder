import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { groupCreateSchema } from "@/lib/validations/group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { notifyAdminsAboutNewTags, notifyUsersAboutNewGroup } from "@/lib/notifications";
import logger from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";

function getGroupLikeDelegate() {
  return (prisma as unknown as { groupLike?: typeof prisma.favoriteGroup }).groupLike;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await getServerSession(authOptions).catch(() => null);
  const query = searchParams.get("query");
  const tag = searchParams.get("tag");
  const performancesRaw = searchParams.get("performances");
  const seekingRaw = searchParams.get("seeking");
  const sizeRaw = searchParams.get("size");
  const sortRaw = (searchParams.get("sort") || "").trim();
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const radiusRaw = searchParams.get("radius");
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const radiusKm = radiusRaw ? Number(radiusRaw) : NaN;

  const onlyPerformances = performancesRaw === "1";
  const onlySeekingMembers = seekingRaw === "1";
  const size = sizeRaw && ["SOLO", "DUO", "TRIO", "SMALL", "LARGE"].includes(sizeRaw) ? sizeRaw : null;

  const sort = sortRaw === "name" || sortRaw === "distance" || sortRaw === "popular" ? sortRaw : "newest";
  
  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;

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
  
  const whereClause: {
    OR?: Array<{
      name?: { contains: string };
      description?: { contains: string };
      tags?: { some: { name: { contains: string } } };
      danceStyles?: { some: { style: { name: { contains: string } } } };
    }>;
    tags?: { some: { name: { equals: string } } };
    danceStyles?: { some: { style: { name: { equals: string } } } };
    location?: { lat: { gte: number; lte: number }; lng: { gte: number; lte: number } };
    performances?: boolean;
    seekingMembers?: boolean;
    size?: string;
  } = {};
  
  if (query) {
    whereClause.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
      { tags: { some: { name: { contains: query } } } },
      { danceStyles: { some: { style: { name: { contains: query } } } } }
    ];
  }

  if (tag) {
    whereClause.tags = { some: { name: { equals: tag } } };
    whereClause.danceStyles = { some: { style: { name: { equals: tag } } } };
  }

  if (onlyPerformances) {
    whereClause.performances = true;
  }

  if (onlySeekingMembers) {
    whereClause.seekingMembers = true;
  }

  if (size) {
    whereClause.size = size;
  }

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const r = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 50;
    const latDelta = r / 111;
    const lngDelta = r / (111 * Math.cos((lat * Math.PI) / 180) || 1);

    whereClause.location = {
      lat: { gte: lat - latDelta, lte: lat + latDelta },
      lng: { gte: lng - lngDelta, lte: lng + lngDelta },
    };
  }

  try {
    const [total, groups] = await Promise.all([
      prisma.group.count({ where: whereClause }),
      (async () => {
        if (sort === "distance" && Number.isFinite(lat) && Number.isFinite(lng)) {
          const takeForDistance = Math.min(MAX_PAGE_SIZE, skip + limit);
          const unsorted = await prisma.group.findMany({
            where: whereClause,
            include: {
              location: true,
              tags: true,
              danceStyles: { include: { style: true } },
              owner: {
                select: {
                  name: true,
                  image: true,
                }
              }
            },
            take: takeForDistance,
          });

          const sorted = unsorted
            .map((g) => {
              const glat = (g.location as { lat?: number } | null)?.lat;
              const glng = (g.location as { lng?: number } | null)?.lng;
              const d =
                typeof glat === "number" && typeof glng === "number" && Number.isFinite(glat) && Number.isFinite(glng)
                  ? haversineKm(lat, lng, glat, glng)
                  : Number.POSITIVE_INFINITY;
              return { g, d };
            })
            .sort((a, b) => a.d - b.d)
            .slice(skip, skip + limit)
            .map((x) => x.g);

          return sorted;
        }

        const orderBy =
          sort === "name"
            ? [{ name: "asc" }]
            : sort === "popular"
              ? [
                  // Works once the Prisma client includes the `likes` relation on Group.
                  // If the relation is missing (e.g. old client), the query will throw and we fall back below.
                  { likes: { _count: "desc" } },
                  { createdAt: "desc" },
                ]
              : [{ createdAt: "desc" }];

        try {
          return await prisma.group.findMany({
            where: whereClause,
            include: {
              location: true,
              tags: true,
              danceStyles: { include: { style: true } },
              owner: {
                select: {
                  name: true,
                  image: true,
                }
              }
            },
            orderBy: orderBy as unknown as NonNullable<Parameters<typeof prisma.group.findMany>[0]>["orderBy"],
            skip,
            take: limit,
          });
        } catch (e) {
          // If `sort=popular` is requested but the prisma client is out of date, fall back to newest.
          if (sort !== "popular") throw e;
          return prisma.group.findMany({
            where: whereClause,
            include: {
              location: true,
              tags: true,
              danceStyles: { include: { style: true } },
              owner: {
                select: {
                  name: true,
                  image: true,
                }
              }
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          });
        }
      })(),
    ]);

    const groupIds = groups.map((g) => g.id);

    const groupLike = getGroupLikeDelegate();
    if (!groupLike) {
      return NextResponse.json({
        data: groups.map((g) => ({ ...g, likeCount: 0, likedByMe: false })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + groups.length < total,
        },
      });
    }

    const likeCounts = groupIds.length
      ? await groupLike.groupBy({
          by: ["groupId"],
          where: { groupId: { in: groupIds } },
          _count: { _all: true },
        })
      : [];
    const likeCountByGroupId = new Map<string, number>(
      likeCounts.map((x: { groupId: string; _count: { _all: number } }) => [x.groupId, x._count._all])
    );

    const likedSet = session?.user?.id
      ? new Set(
          (
            await groupLike.findMany({
              where: { userId: session.user.id, groupId: { in: groupIds } },
              select: { groupId: true },
            })
          ).map((x: { groupId: string }) => x.groupId)
        )
      : new Set<string>();

    const enriched = groups.map((g) => ({
      ...g,
      likeCount: likeCountByGroupId.get(g.id) ?? 0,
      likedByMe: likedSet.has(g.id),
    }));

    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + groups.length < total,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "PrismaClientRustPanicError") {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }
    logger.error({ error }, "Error fetching groups");
    return NextResponse.json({ message: "Fehler beim Laden der Gruppen" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`groups:create:${clientId}`, RATE_LIMITS.create);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          message: "Benutzer nicht in der Datenbank gefunden",
          details:
            "Deine Session passt vermutlich nicht zur aktuellen Datenbank. Bitte einmal abmelden und wieder anmelden (oder DATABASE_URL prüfen).",
        },
        { status: 409 }
      );
    }

    const body = await req.json();
    logger.debug({ body }, "POST /api/groups - Received body");

    const validatedData = groupCreateSchema.parse(body);
    logger.debug({ validatedData }, "POST /api/groups - Validated data");

    const danceStylesInput =
      validatedData.danceStyles && validatedData.danceStyles.length > 0
        ? validatedData.danceStyles
        : validatedData.tags && validatedData.tags.length > 0
          ? validatedData.tags.map((name) => ({ name, level: "INTERMEDIATE" as const }))
          : [];

    const danceStylesCreate = danceStylesInput.length
      ? {
          create: await Promise.all(
            danceStylesInput.map(async (ds) => {
              if ("styleId" in ds) {
                // Cast for resilience when a stale Prisma client type is used locally.
                return { level: ds.level, mode: (ds.mode ?? null) as unknown, style: { connect: { id: ds.styleId } } };
              }
              const style = await prisma.danceStyle.upsert({
                where: { name: ds.name },
                update: {},
                create: { name: ds.name },
                select: { id: true },
              });
              return { level: ds.level, mode: null, style: { connect: { id: style.id } } };
            })
          ),
        }
      : undefined;

    // Prüfen auf neue Tags für Benachrichtigung
    let newTagsToNotify: string[] = [];
    if (validatedData.tags && validatedData.tags.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: validatedData.tags } },
        select: { name: true }
      });
      const existingTagNames = existingTags.map((t: { name: string }) => t.name);
      newTagsToNotify = validatedData.tags.filter(tag => !existingTagNames.includes(tag));
    }

    logger.debug("POST /api/groups - Creating group in DB...");
    const group = await prisma.group.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        website: validatedData.website,
        contactEmail: validatedData.contactEmail,
        videoUrl: validatedData.videoUrl,
        size: validatedData.size,
        image: validatedData.image,
        headerImage: validatedData.headerImage,
        headerImageFocusY: validatedData.headerImageFocusY,
        headerGradientFrom: validatedData.headerGradientFrom,
        headerGradientTo: validatedData.headerGradientTo,
        
        trainingTime: validatedData.trainingTime,
        accessories: (validatedData as unknown as { accessories?: string }).accessories,
        performances: validatedData.performances || false,
        foundingYear: validatedData.foundingYear,
        seekingMembers: validatedData.seekingMembers || false,

        owner: {
          connect: { id: session.user.id }
        },
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
            status: 'APPROVED'
          }
        },
        location: validatedData.location ? {
          create: {
            lat: validatedData.location.lat,
            lng: validatedData.location.lng,
            address: validatedData.location.address
          }
        } : undefined,
        tags: validatedData.tags ? {
          connectOrCreate: validatedData.tags.map(tag => ({
            where: { name: tag },
            create: { name: tag }
          }))
        } : undefined,
        danceStyles: danceStylesCreate,
      }
    } as unknown as Parameters<typeof prisma.group.create>[0]);
    logger.info({ groupId: group.id }, "POST /api/groups - Group created");

    // Benachrichtigung senden (async, wir warten nicht zwingend auf den Erfolg)
    if (newTagsToNotify.length > 0) {
      notifyAdminsAboutNewTags(newTagsToNotify, session.user.name || session.user.email || "Unbekannt").catch(err => logger.error({ err }, "Tag notification error"));
    }

    // Notify users about new group in their vicinity
    if (validatedData.location) {
      notifyUsersAboutNewGroup(group.id, group.name, validatedData.location.lat, validatedData.location.lng)
        .catch(err => logger.error({ err }, "New group notification error"));
    }

    revalidatePath("/map");

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "PrismaClientRustPanicError") {
      return NextResponse.json(
        { message: "Datenbankfehler (Prisma Engine)" },
        { status: 503 }
      );
    }
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.issues }, "POST /api/groups - Validation error");
      return NextResponse.json({ message: "Ungültige Daten", errors: error.issues }, { status: 400 });
    }

    const err = error as Error & { code?: string; meta?: unknown };
    logger.error(
      {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack,
      },
      "POST /api/groups - Error creating group"
    );

    return NextResponse.json(
      {
        message: "Fehler beim Erstellen der Gruppe",
        details: err?.message || (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
