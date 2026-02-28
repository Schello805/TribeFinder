import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { eventSchema } from "@/lib/validations/event";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  try {
    const eventDelegate = (prisma as unknown as {
      event: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).event;

    const event = await eventDelegate.findUnique({
      where: { id },
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
    });

    if (!event) {
      return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { message: "Fehler beim Laden des Events", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const eventDelegate = (prisma as unknown as {
      event: {
        findUnique: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
      };
    }).event;

    const body = await req.json();
    const validatedData = eventSchema.parse(body);

    const flyer1 = normalizeUploadedImageUrl(validatedData.flyer1) ?? undefined;
    const flyer2 = normalizeUploadedImageUrl(validatedData.flyer2) ?? undefined;

    const event = await eventDelegate.findUnique({
      where: { id },
      include: { group: true },
    });

    const eventAny = event as unknown as {
      creatorId: string | null;
      groupId: string | null;
      group: { ownerId: string } | null;
    };

    if (!event) {
      return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
    }

    if (!eventAny.group) {
      if (eventAny.creatorId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Nicht autorisiert" }, { status: 403 });
      }
    } else {
      if (eventAny.group.ownerId !== session.user.id && session.user.role !== "ADMIN") {
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId: eventAny.groupId!,
            },
          },
          select: { role: true, status: true },
        });

        if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
          return NextResponse.json({ message: "Nur Administratoren können Events bearbeiten" }, { status: 403 });
        }
      }
    }

    const updateDataBase = {
      title: validatedData.title,
      description: validatedData.description,
      eventType: validatedData.eventType,
      startDate: new Date(validatedData.startDate),
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      locationName: validatedData.locationName,
      address: validatedData.address,
      lat: validatedData.lat,
      lng: validatedData.lng,
      flyer1,
      flyer2,
      website: validatedData.website,
      ticketLink: validatedData.ticketLink,
      ticketPrice: validatedData.ticketPrice,
      organizer: validatedData.organizer,
      maxParticipants: validatedData.maxParticipants ?? null,
      requiresRegistration: validatedData.requiresRegistration ?? false,
    };

    const updateDataWithStyles = {
      ...updateDataBase,
      danceStyles: {
        deleteMany: {},
        ...(Array.isArray(validatedData.danceStyleIds) && validatedData.danceStyleIds.length > 0
          ? {
              createMany: {
                data: validatedData.danceStyleIds.map((styleId) => ({ styleId })),
                skipDuplicates: true,
              },
            }
          : {}),
      },
    };

    let updatedEvent: unknown;
    try {
      updatedEvent = await eventDelegate.update({
        where: { id },
        data: updateDataWithStyles,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Unknown argument `danceStyles`") || msg.includes("Unknown field `danceStyles`")) {
        updatedEvent = await eventDelegate.update({
          where: { id },
          data: updateDataBase,
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Daten", errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Fehler beim Aktualisieren des Events", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!event) {
      return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
    }

    if (!event.group) {
      if (event.creatorId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Nur der Ersteller kann dieses Event löschen" }, { status: 403 });
      }
    } else {
      if (event.group.ownerId !== session.user.id && session.user.role !== "ADMIN") {
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId: event.groupId!,
            },
          },
          select: { role: true, status: true },
        });

        if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
          return NextResponse.json({ message: "Nur der Gruppenbesitzer kann Events löschen" }, { status: 403 });
        }
      }
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event gelöscht" });
  } catch {
    return NextResponse.json(
      { message: "Fehler beim Löschen des Events" },
      { status: 500 }
    );
  }
}
