import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyUserMembershipApproved } from "@/lib/notifications";
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
    const { userId, action, role } = body;

    // Verify requesting user is admin of the group
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Nur Administratoren können Mitglieder verwalten" },
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
      if (role !== "ADMIN" && role !== "MEMBER") {
        return NextResponse.json({ message: "Ungültige Rolle" }, { status: 400 });
      }
      await prisma.groupMember.update({
        where: {
          userId_groupId: {
            userId,
            groupId: id,
          },
        },
        data: {
          role,
        },
      });
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

    // Verify requesting user is admin of the group
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Nur Administratoren können Mitglieder entfernen" },
        { status: 403 }
      );
    }

    // Prevent removing the group owner
    const group = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true }
    });

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

    return NextResponse.json({ message: "Mitglied entfernt" });
  } catch (error) {
    logger.error({ error, groupId: id }, "Error removing member");
    return NextResponse.json(
      { message: "Fehler beim Entfernen des Mitglieds" },
      { status: 500 }
    );
  }
}
