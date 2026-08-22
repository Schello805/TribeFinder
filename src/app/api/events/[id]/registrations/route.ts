import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyEventWaitlistPromotion } from "@/lib/notifications";
import { Prisma } from "@prisma/client";

async function getEventAccess(eventId: string, userId?: string, role?: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      requiresRegistration: true,
      maxParticipants: true,
      creatorId: true,
      group: { select: { ownerId: true } },
    },
  });

  const isManager = Boolean(
    event && userId && (role === "ADMIN" || event.creatorId === userId || event.group?.ownerId === userId)
  );

  return { event, isManager };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const { event, isManager } = await getEventAccess(id, session?.user?.id, session?.user?.role);

  if (!event) return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });

  const [confirmedCount, waitlistCount, current, registrations] = await Promise.all([
    prisma.eventRegistration.count({ where: { eventId: id, status: "CONFIRMED" } }),
    prisma.eventRegistration.count({ where: { eventId: id, status: "WAITLIST" } }),
    session?.user?.id
      ? prisma.eventRegistration.findUnique({
          where: { eventId_userId: { eventId: id, userId: session.user.id } },
          select: { id: true, status: true, createdAt: true },
        })
      : null,
    isManager
      ? prisma.eventRegistration.findMany({
          where: { eventId: id },
          select: {
            id: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, name: true, image: true, email: true } },
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        })
      : [],
  ]);

  return NextResponse.json({
    confirmedCount,
    waitlistCount,
    maxParticipants: event.maxParticipants,
    currentRegistration: current,
    registrations,
    canManage: isManager,
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Bitte zuerst anmelden" }, { status: 401 });

  const { event } = await getEventAccess(id, session.user.id, session.user.role);
  if (!event) return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
  if (!event.requiresRegistration) {
    return NextResponse.json({ message: "Für dieses Event ist keine Anmeldung aktiviert" }, { status: 400 });
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: id, userId: session.user.id } },
  });
  if (existing) return NextResponse.json(existing, { status: 200 });

  let registration: { id: string; status: string; createdAt: Date } | null = null;
  for (let attempt = 0; attempt < 3 && !registration; attempt += 1) {
    try {
      registration = await prisma.$transaction(async (tx) => {
        const confirmedCount = await tx.eventRegistration.count({
          where: { eventId: id, status: "CONFIRMED" },
        });
        const status = event.maxParticipants !== null && confirmedCount >= event.maxParticipants ? "WAITLIST" : "CONFIRMED";
        return tx.eventRegistration.create({
          data: { eventId: id, userId: session.user.id, status },
          select: { id: true, status: true, createdAt: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }

  if (!registration) return NextResponse.json({ message: "Anmeldung konnte nicht gespeichert werden" }, { status: 503 });

  return NextResponse.json(registration, { status: 201 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Bitte zuerst anmelden" }, { status: 401 });

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: id, userId: session.user.id } },
  });
  if (!existing) return NextResponse.json({ message: "Keine Anmeldung vorhanden" }, { status: 404 });

  const promoted = await prisma.$transaction(async (tx) => {
    await tx.eventRegistration.delete({ where: { id: existing.id } });
    if (existing.status !== "CONFIRMED") return null;

    const next = await tx.eventRegistration.findFirst({
      where: { eventId: id, status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true },
    });
    if (!next) return null;

    await tx.eventRegistration.update({ where: { id: next.id }, data: { status: "CONFIRMED" } });
    return next;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (promoted) void notifyEventWaitlistPromotion(id, promoted.userId);
  return NextResponse.json({ success: true, promotedUserId: promoted?.userId ?? null });
}
