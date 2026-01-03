import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

// PUT: Update status (Approve/Reject)
export async function PUT(
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
    const validatedData = updateSchema.parse(body);

    const participation = await prisma.eventParticipation.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            group: true, // The group organizing the event
          },
        },
      },
    });

    if (!participation) {
      return NextResponse.json({ message: "Anfrage nicht gefunden" }, { status: 404 });
    }

    // Check authorization: User must be admin of the *Event's* group
    const eventGroup = participation.event.group;
    
    let isEventGroupAdmin = false;

    if (eventGroup) {
        // Check if user is owner of the event group
        const isOwner = eventGroup.ownerId === session.user.id;
        
        // Check if user is admin member of the event group
        const membership = await prisma.groupMember.findUnique({
        where: {
            userId_groupId: {
            userId: session.user.id,
            groupId: eventGroup.id,
            },
        },
        });
        
        isEventGroupAdmin = isOwner || (!!membership && membership.role === "ADMIN" && membership.status === "APPROVED");
    } else {
        // Independent event: Check if user is the creator
        const event = await prisma.event.findUnique({ where: { id: participation.eventId } });
        if (event && event.creatorId === session.user.id) {
            isEventGroupAdmin = true;
        }
    }

    if (!isEventGroupAdmin) {
      return NextResponse.json(
        { message: "Nur Veranstalter können Anfragen bearbeiten" },
        { status: 403 }
      );
    }

    const updated = await prisma.eventParticipation.update({
      where: { id },
      data: { status: validatedData.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Daten", errors: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating participation:", error);
    return NextResponse.json(
      { message: "Fehler beim Aktualisieren" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel participation (by requester or host)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const participation = await prisma.eventParticipation.findUnique({
      where: { id },
      include: {
        event: { include: { group: true } }, // Event Host
        group: { include: { owner: true } }, // Participant Group
      },
    });

    if (!participation) {
      return NextResponse.json({ message: "Eintrag nicht gefunden" }, { status: 404 });
    }

    // Permissions:
    // 1. Admin of the Event Group (Host)
    // 2. Admin of the Participant Group (Requester)

    // Check Host Permissions
    const eventGroup = participation.event.group;
    let isHostAdmin = false;

    if (eventGroup) {
        const isHostOwner = eventGroup.ownerId === session.user.id;
        const hostMembership = await prisma.groupMember.findUnique({
          where: { userId_groupId: { userId: session.user.id, groupId: eventGroup.id } },
        });
        isHostAdmin = isHostOwner || (!!hostMembership && hostMembership.role === "ADMIN" && hostMembership.status === "APPROVED");
    } else {
        // Independent event
        isHostAdmin = participation.event.creatorId === session.user.id;
    }

    // Check Participant Permissions
    const participantGroup = participation.group;
    const isParticipantOwner = participantGroup.ownerId === session.user.id;
    const participantMembership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: participantGroup.id } },
    });
    const isParticipantAdmin = isParticipantOwner || (participantMembership && participantMembership.role === "ADMIN" && participantMembership.status === "APPROVED");

    if (!isHostAdmin && !isParticipantAdmin) {
      return NextResponse.json(
        { message: "Nicht berechtigt, diese Teilnahme zu löschen" },
        { status: 403 }
      );
    }

    await prisma.eventParticipation.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Teilnahme gelöscht" });
  } catch (error) {
    console.error("Error deleting participation:", error);
    return NextResponse.json(
      { message: "Fehler beim Löschen" },
      { status: 500 }
    );
  }
}
