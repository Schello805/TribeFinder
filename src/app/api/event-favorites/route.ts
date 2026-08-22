import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const eventIdSchema = z.string().min(1);
const updateSchema = z.object({
  eventId: eventIdSchema,
  remindWeek: z.boolean().optional(),
  remindDay: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (eventId) {
    const favorite = await prisma.favoriteEvent.findUnique({
      where: { userId_eventId: { userId: session.user.id, eventId } },
      select: { id: true, remindWeek: true, remindDay: true },
    });
    return NextResponse.json({ favorite });
  }

  const favorites = await prisma.favoriteEvent.findMany({
    where: { userId: session.user.id },
    include: { event: { include: { group: { select: { id: true, name: true } } } } },
    orderBy: { event: { startDate: "asc" } },
  });
  return NextResponse.json({ favorites });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Bitte zuerst anmelden" }, { status: 401 });
  const parsed = eventIdSchema.safeParse((await req.json().catch(() => ({})))?.eventId);
  if (!parsed.success) return NextResponse.json({ message: "Event fehlt" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: parsed.data }, select: { id: true, startDate: true } });
  if (!event) return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
  if (event.startDate < new Date()) return NextResponse.json({ message: "Vergangene Events können nicht gemerkt werden" }, { status: 400 });

  const favorite = await prisma.favoriteEvent.upsert({
    where: { userId_eventId: { userId: session.user.id, eventId: parsed.data } },
    create: { userId: session.user.id, eventId: parsed.data },
    update: {},
    select: { id: true, remindWeek: true, remindDay: true },
  });
  return NextResponse.json({ favorite }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Ungültige Einstellungen" }, { status: 400 });

  const favorite = await prisma.favoriteEvent.update({
    where: { userId_eventId: { userId: session.user.id, eventId: parsed.data.eventId } },
    data: {
      ...(parsed.data.remindWeek !== undefined ? { remindWeek: parsed.data.remindWeek, weekReminderSentAt: null } : {}),
      ...(parsed.data.remindDay !== undefined ? { remindDay: parsed.data.remindDay, dayReminderSentAt: null } : {}),
    },
    select: { id: true, remindWeek: true, remindDay: true },
  });
  return NextResponse.json({ favorite });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ message: "Event fehlt" }, { status: 400 });
  await prisma.favoriteEvent.deleteMany({ where: { userId: session.user.id, eventId } });
  return NextResponse.json({ success: true });
}
