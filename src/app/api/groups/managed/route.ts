import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json([]);
  }

  try {
    // 1. Groups owned by user
    const ownedGroups = await prisma.group.findMany({
      where: { ownerId: session.user.id },
      select: { id: true, name: true }
    });

    // 2. Groups where user is ADMIN
    const adminMemberships = await prisma.groupMember.findMany({
      where: {
        userId: session.user.id,
        role: "ADMIN",
        status: "APPROVED"
      },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    const adminGroups = adminMemberships.map((m) => m.group);

    // Merge and deduplicate
    const allGroups = [...ownedGroups, ...adminGroups].filter((g, index, self) =>
      index === self.findIndex((t) => t.id === g.id)
    );

    return NextResponse.json(allGroups);
  } catch (error) {
    console.error("Error fetching managed groups:", error);
    return NextResponse.json({ message: "Fehler beim Laden der Gruppen" }, { status: 500 });
  }
}
