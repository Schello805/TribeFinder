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
  console.log("[api/events/[id]] GET", { id, url: req.url });
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            image: true,
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

  console.log("[api/events/[id]] PUT", {
    id,
    url: req.url,
    userId: session?.user?.id ?? null,
  });

  if (!session || !session.user) {
    console.warn("[api/events/[id]] PUT unauthorized (no session)", { id });
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("[api/events/[id]] PUT body keys", { id, keys: Object.keys(body ?? {}) });
    const validatedData = eventSchema.parse(body);

    const flyer1 = normalizeUploadedImageUrl(validatedData.flyer1) ?? undefined;
    const flyer2 = normalizeUploadedImageUrl(validatedData.flyer2) ?? undefined;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!event) {
      return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
    }

    if (!event.group) {
        if (event.creatorId !== session.user.id) {
             console.warn("[api/events/[id]] PUT forbidden (not creator)", {
               id,
               creatorId: event.creatorId,
               userId: session.user.id,
             });
             return NextResponse.json({ message: "Nicht autorisiert" }, { status: 403 });
        }
    } else {
      if (!event.group) {
        return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
      }
      if (event.group.ownerId !== session.user.id) {
        // Check if user is an admin member
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId: event.groupId!, // We know groupId exists if group exists
            },
          },
        });

        if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
          console.warn("[api/events/[id]] PUT forbidden (not group owner/admin)", {
            id,
            groupId: event.groupId,
            ownerId: event.group.ownerId,
            userId: session.user.id,
            membership: membership ? { role: membership.role, status: membership.status } : null,
          });
          return NextResponse.json(
            { message: "Nur Administratoren können Events bearbeiten" },
            { status: 403 }
          );
        }
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
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
      },
    });

    console.log("Event updated successfully:", updatedEvent.id);
    return NextResponse.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.issues);
      return NextResponse.json(
        { message: "Ungültige Daten", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating event:", error);
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

  console.log("[api/events/[id]] DELETE", {
    id,
    url: req.url,
    userId: session?.user?.id ?? null,
  });

  if (!session || !session.user) {
    console.warn("[api/events/[id]] DELETE unauthorized (no session)", { id });
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
        if (event.creatorId !== session.user.id) {
             return NextResponse.json(
                { message: "Nur der Ersteller kann dieses Event löschen" },
                { status: 403 }
              );
        }
    } else if (event.group.ownerId !== session.user.id) {
      return NextResponse.json(
        { message: "Nur der Gruppenbesitzer kann Events löschen" },
        { status: 403 }
      );
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event gelöscht" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { message: "Fehler beim Löschen des Events" },
      { status: 500 }
    );
  }
}
