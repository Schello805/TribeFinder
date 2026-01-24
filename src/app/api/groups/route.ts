import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { groupSchema } from "@/lib/validations/group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { notifyAdminsAboutNewTags, notifyUsersAboutNewGroup } from "@/lib/notifications";
import logger from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  
  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;
  
  const whereClause: { OR?: Array<{ name?: { contains: string }; description?: { contains: string }; tags?: { some: { name: { contains: string } } } }> } = {};
  
  if (query) {
    whereClause.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
      { tags: { some: { name: { contains: query } } } }
    ];
  }

  try {
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where: whereClause,
        include: {
          location: true,
          tags: true,
          owner: {
            select: {
              name: true,
              image: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.group.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: groups,
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
            "Deine Session passt vermutlich nicht zur aktuellen SQLite-Datenbank. Bitte einmal abmelden und wieder anmelden (oder DATABASE_URL prüfen).",
        },
        { status: 409 }
      );
    }

    const body = await req.json();
    logger.debug({ body }, "POST /api/groups - Received body");

    const validatedData = groupSchema.parse(body);
    logger.debug({ validatedData }, "POST /api/groups - Validated data");

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
        } : undefined
      }
    });
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
