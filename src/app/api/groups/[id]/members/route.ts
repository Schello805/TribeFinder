import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyUserMembershipApproved, notifyUserRemovedFromGroup } from "@/lib/notifications";
import logger from "@/lib/logger";

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
    const { userId, action } = body;

    const group = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!group) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    // Verify requesting user is an APPROVED member of the group (or owner)
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    const canManage = group.ownerId === session.user.id || requesterMembership?.status === "APPROVED";
    if (!canManage) {
      return NextResponse.json(
        { message: "Nur bestätigte Mitglieder können Beitrittsanfragen verwalten" },
        { status: 403 }
      );
    }

    if (action === "approve") {
      await prisma.groupMember.update({
        where: {
          userId_groupId: {
            userId,
            groupId: id,
          },
        },
        data: {
          status: "APPROVED",
        },
      });

      // Send notification to approved user (async, don't block)
      notifyUserMembershipApproved(userId, id)
        .catch(err => logger.error({ err }, "Failed to send approval notification"));
    } else if (action === "update_role") {
      return NextResponse.json(
        { message: "Rollenverwaltung ist aktuell nicht aktiv" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Erfolgreich aktualisiert" });
  } catch (error) {
    logger.error({ error, groupId: id }, "Error updating member");
    return NextResponse.json(
      { message: "Fehler beim Aktualisieren des Mitglieds" },
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

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "Benutzer ID fehlt" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!group) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    // Verify requesting user is an APPROVED member of the group (or owner)
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    const canManage = group.ownerId === session.user.id || requesterMembership?.status === "APPROVED";
    if (!canManage) {
      return NextResponse.json(
        { message: "Nur bestätigte Mitglieder können Mitglieder entfernen" },
        { status: 403 }
      );
    }

    if (group?.ownerId === userId) {
      return NextResponse.json(
        { message: "Der Gruppenbesitzer kann nicht entfernt werden" },
        { status: 403 }
      );
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId: id,
        },
      },
    });

    if (userId !== session.user.id) {
      const removedByName = session.user.name || session.user.email || "Ein Gruppenmitglied";
      notifyUserRemovedFromGroup({ userId, groupId: id, removedByName }).catch((err) =>
        logger.error({ err, groupId: id, userId }, "Failed to send removed-from-group notification")
      );
    }

    return NextResponse.json({ message: "Mitglied entfernt" });
  } catch (error) {
    logger.error({ error, groupId: id }, "Error removing member");
    return NextResponse.json(
      { message: "Fehler beim Entfernen des Mitglieds" },
      { status: 500 }
    );
  }
}
