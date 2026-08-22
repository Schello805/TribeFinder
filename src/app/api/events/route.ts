import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { eventSchema } from "@/lib/validations/event";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import logger from "@/lib/logger";
import { notifyUsersAboutNewEvent } from "@/lib/notifications";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import type { Prisma } from "@prisma/client";
// Rate limiting imports available if needed
// import { rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const groupId = searchParams.get("groupId");
  const upcomingOnly = searchParams.get("upcoming") === "true";
  const type = searchParams.get("type");
  const danceStyleId = (searchParams.get("danceStyleId") || "").trim();

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;

  const whereClause: {
    groupId?: string;
    eventType?: string;
    startDate?: { gte: Date };
    OR?: Array<{ title?: { contains: string }; locationName?: { contains: string }; address?: { contains: string } }>;
    danceStyles?: { some: { styleId: string } };
  } = {};

  if (groupId) {
    whereClause.groupId = groupId;
  }

  if (type) {
    whereClause.eventType = type;
  }

  if (upcomingOnly) {
    whereClause.startDate = {
      gte: new Date(),
    };
  }

  if (q) {
    whereClause.OR = [
      { title: { contains: q } },
      { locationName: { contains: q } },
      { address: { contains: q } },
    ];
  }

  if (danceStyleId) {
    whereClause.danceStyles = { some: { styleId: danceStyleId } };
  }

  try {
    const eventDelegate = (prisma as unknown as {
      event: {
        findMany: (args: unknown) => Promise<unknown[]>;
        count: (args: unknown) => Promise<number>;
      };
    }).event;

    const [events, total] = await Promise.all([
      eventDelegate.findMany({
        where: whereClause,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          danceStyles: {
            include: {
              style: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startDate: "asc",
        },
        skip,
        take: limit,
      }),
      eventDelegate.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + events.length < total,
      },
    });
  } catch (error) {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: error };

    logger.error({ error: errorDetails }, "Error fetching events");

    return NextResponse.json(
      {
        message: "Fehler beim Laden der Events",
        ...(process.env.NODE_ENV !== "production" ? { details: errorDetails } : {}),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = eventSchema.parse(body);

    const flyer1 = normalizeUploadedImageUrl(validatedData.flyer1) ?? undefined;
    const flyer2 = normalizeUploadedImageUrl(validatedData.flyer2) ?? undefined;

    // Verify group ownership if a group is selected
    if (validatedData.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: validatedData.groupId },
      });

      if (!group) {
        return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
      }

      if (group.ownerId !== session.user.id) {
        // Check if user is an admin member
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId: validatedData.groupId,
            },
          },
        });

        if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
          return NextResponse.json(
            { message: "Nur Administratoren können Events für diese Gruppe erstellen" },
            { status: 403 }
          );
        }
      }
    }

    const createDataBase: Prisma.EventCreateInput = {
      title: validatedData.title,
      description: validatedData.description,
      eventType: validatedData.eventType,
      startDate: new Date(validatedData.startDate),
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      locationName: validatedData.locationName,
      address: validatedData.address,
      country: validatedData.country,
      lat: validatedData.lat,
      lng: validatedData.lng,
      flyer1,
      flyer2,
      website: validatedData.website,
      ticketLink: validatedData.ticketLink,
      ticketPrice: validatedData.ticketPrice,
      organizer: validatedData.organizer,
      maxParticipants: validatedData.maxParticipants || null,
      requiresRegistration: validatedData.requiresRegistration || false,
      creator: {
        connect: { id: session.user.id },
      },
      ...(validatedData.groupId
        ? {
            group: {
              connect: { id: validatedData.groupId },
            },
          }
        : {}),
    };

    const createDataWithStyles: Prisma.EventCreateInput = {
      ...createDataBase,
      ...(Array.isArray(validatedData.danceStyleIds) && validatedData.danceStyleIds.length > 0
        ? {
            danceStyles: {
              createMany: {
                data: validatedData.danceStyleIds.map((styleId) => ({ styleId })),
                skipDuplicates: true,
              },
            },
          }
        : {}),
    };

    const recurrenceFrequency = validatedData.recurrenceFrequency || "NONE";
    const recurrenceCount = recurrenceFrequency === "NONE" ? 1 : (validatedData.recurrenceCount || 2);
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    const shiftDate = (date: Date, occurrence: number) => {
      const shifted = new Date(date);
      if (recurrenceFrequency === "WEEKLY") shifted.setUTCDate(shifted.getUTCDate() + occurrence * 7);
      if (recurrenceFrequency === "MONTHLY") {
        const originalDay = shifted.getUTCDate();
        shifted.setUTCDate(1);
        shifted.setUTCMonth(shifted.getUTCMonth() + occurrence);
        const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
        shifted.setUTCDate(Math.min(originalDay, lastDay));
      }
      return shifted;
    };

    const createdEvents = await prisma.$transaction(async (tx) => {
      const series = recurrenceCount > 1
        ? await tx.eventSeries.create({ data: { frequency: recurrenceFrequency, count: recurrenceCount } })
        : null;
      const rows = [];
      for (let occurrence = 0; occurrence < recurrenceCount; occurrence += 1) {
        rows.push(await tx.event.create({
          data: {
            ...createDataWithStyles,
            startDate: shiftDate(startDate, occurrence),
            endDate: shiftDate(endDate, occurrence),
            ...(series ? { series: { connect: { id: series.id } } } : {}),
          },
          select: { id: true, title: true },
        }));
      }
      return rows;
    });
    const created = createdEvents[0];

    // Notify users about new event in their vicinity
    if (validatedData.lat && validatedData.lng) {
      notifyUsersAboutNewEvent(
        created.id,
        created.title,
        validatedData.lat,
        validatedData.lng,
        new Date(validatedData.startDate)
      ).catch(err => logger.error({ err }, "New event notification error"));
    }

    return NextResponse.json({ ...created, seriesCount: createdEvents.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Daten", errors: error.issues },
        { status: 400 }
      );
    }
    logger.error({ error }, "Error creating event");
    return NextResponse.json(
      { message: "Fehler beim Erstellen des Events", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
