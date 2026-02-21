import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, ownerId: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
  }

  const userId = session.user.id;
  const isGlobalAdmin = session.user.role === "ADMIN";

  let canManage = false;
  if (isGlobalAdmin) canManage = true;
  if (event.creatorId === userId) canManage = true;

  if (!canManage && event.groupId) {
    if (event.group?.ownerId === userId) {
      canManage = true;
    } else {
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: event.groupId,
          },
        },
        select: { role: true, status: true },
      });

      if (membership?.role === "ADMIN" && membership?.status === "APPROVED") {
        canManage = true;
      }
    }
  }

  if (!canManage) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 403 });
  }

  const now = new Date();
  const durationMs = event.endDate ? event.endDate.getTime() - event.startDate.getTime() : 2 * 60 * 60 * 1000;
  const safeDurationMs = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 2 * 60 * 60 * 1000;

  let newStart = new Date(event.startDate);
  if (newStart < now) {
    // Keep time-of-day but move into the future to avoid validation issues.
    newStart = addDays(now, 7);
    newStart.setHours(event.startDate.getHours(), event.startDate.getMinutes(), 0, 0);
    if (newStart < now) {
      newStart = addDays(newStart, 1);
    }
  }

  const newEnd = new Date(newStart.getTime() + safeDurationMs);

  const created = await prisma.event.create({
    data: {
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: newStart,
      endDate: newEnd,
      locationName: event.locationName,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
      flyer1: event.flyer1,
      flyer2: event.flyer2,
      website: event.website,
      ticketLink: event.ticketLink,
      ticketPrice: event.ticketPrice,
      organizer: event.organizer,
      maxParticipants: event.maxParticipants,
      requiresRegistration: event.requiresRegistration,
      creatorId: userId,
      groupId: event.groupId,
    },
    select: { id: true, groupId: true },
  });

  return NextResponse.json({ id: created.id, groupId: created.groupId });
}
