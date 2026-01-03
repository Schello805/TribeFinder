import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyGroupAboutNewMember } from "@/lib/notifications";
import logger from "@/lib/logger";

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
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    // Check if user is already a member or has a pending request
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    if (existingMember) {
      if (existingMember.status === "PENDING") {
        return NextResponse.json(
          { message: "Du hast bereits eine Beitrittsanfrage gesendet." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: "Du bist bereits Mitglied dieser Gruppe." },
        { status: 400 }
      );
    }

    // Create membership request
    await prisma.groupMember.create({
      data: {
        userId: session.user.id,
        groupId: id,
        role: "MEMBER",
        status: "PENDING",
      },
    });

    // Send email notification to group owner/admins (async, don't block response)
    notifyGroupAboutNewMember(
      id,
      session.user.name || session.user.email || "Unbekannt",
      session.user.email || ""
    ).catch(err => logger.error({ err }, "Failed to send join notification"));

    return NextResponse.json({ message: "Beitrittsanfrage gesendet" }, { status: 201 });
  } catch (error) {
    logger.error({ error, groupId: id }, "Error creating join request");
    return NextResponse.json(
      { message: "Fehler beim Senden der Anfrage" },
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
    // Check if membership exists
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    if (!existingMember) {
      return NextResponse.json({ message: "Du bist kein Mitglied dieser Gruppe." }, { status: 404 });
    }

    // Don't allow last admin to leave? Or ownership check?
    // For now, if owner tries to leave, we might want to block or warn. 
    // Usually owner should transfer ownership first.
    const group = await prisma.group.findUnique({
        where: { id },
        select: { ownerId: true }
    });

    if (group?.ownerId === session.user.id) {
        return NextResponse.json({ message: "Als Besitzer kannst du die Gruppe nicht verlassen. Bitte lösche die Gruppe oder übertrage das Eigentum." }, { status: 400 });
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    return NextResponse.json({ message: "Erfolgreich ausgetreten" });
  } catch (error) {
    logger.error({ error, groupId: id }, "Error leaving group");
    return NextResponse.json({ message: "Fehler beim Austreten" }, { status: 500 });
  }
}
