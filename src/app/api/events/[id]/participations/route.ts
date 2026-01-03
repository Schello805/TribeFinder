import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const participationSchema = z.object({
  groupId: z.string().min(1, "Gruppe ist erforderlich"),
  message: z.string().optional(),
});

// GET: List participations for an event
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const id = (await params).id;

  try {
    const participations = await prisma.eventParticipation.findMany({
      where: {
        eventId: id,
        ...(status ? { status } : {}),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            image: true,
            size: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(participations);
  } catch (error) {
    console.error("Error fetching participations:", error);
    return NextResponse.json(
      { message: "Fehler beim Laden der Teilnehmer" },
      { status: 500 }
    );
  }
}

// POST: Request participation
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = participationSchema.parse(body);

    // Verify user is admin of the requesting group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: validatedData.groupId,
        },
      },
    });

    // Check if the user is the owner (via Group model) or an ADMIN member
    const group = await prisma.group.findUnique({
        where: { id: validatedData.groupId },
        select: { ownerId: true }
    });

    if (!group) {
        return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    const isGroupAdmin = group.ownerId === session.user.id || (membership && membership.role === "ADMIN" && membership.status === "APPROVED");

    if (!isGroupAdmin) {
      return NextResponse.json(
        { message: "Nur Gruppen-Admins können Teilnahme anfragen" },
        { status: 403 }
      );
    }

    // Check if already participating or pending
    const existing = await prisma.eventParticipation.findUnique({
      where: {
        eventId_groupId: {
          eventId: id,
          groupId: validatedData.groupId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Anfrage existiert bereits" },
        { status: 409 }
      );
    }

    const participation = await prisma.eventParticipation.create({
      data: {
        eventId: id,
        groupId: validatedData.groupId,
        message: validatedData.message,
        status: "PENDING",
      },
    });

    return NextResponse.json(participation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Daten", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating participation request:", error);
    return NextResponse.json(
      { message: "Fehler bei der Anfrage" },
      { status: 500 }
    );
  }
}
